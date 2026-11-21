import { issueSignedToken, presignUrl } from "@vercel/blob";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { envVars } from "@/lib/env";
import { findVideosPausedUntil } from "@/server/common/videos-paused-until";
import { createTRPCContext } from "@/server/context";
import { findViewableAttachment } from "../find-viewable-attachment";

// Long enough to play a clip of up to 20 MB from one link.
const PLAY_LINK_MINUTES = 15;
// A replay this soon reuses the counted play, and its link ends when that play's link does.
const UNCOUNTED_REPLAY_MINUTES = 10;

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, db } = await createTRPCContext();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!envVars.BLOB_READ_WRITE_TOKEN) {
			return NextResponse.json(
				{ error: "Video storage isn't set up on this server yet." },
				{ status: 503 },
			);
		}

		const { id } = await params;
		const attachment = await findViewableAttachment({ db, user, id });
		if (!attachment?.contentType || attachment.pending) {
			return NextResponse.json(
				{ error: "That video isn't available." },
				{ status: 404 },
			);
		}

		const recentPlay = await db.video_playback.findFirst({
			where: {
				uploadId: id,
				userId: user.id,
				createdAt: {
					gte: DateTime.now()
						.minus({ minutes: UNCOUNTED_REPLAY_MINUTES })
						.toJSDate(),
				},
			},
			orderBy: { createdAt: "desc" },
			select: { createdAt: true },
		});
		let countedAt = recentPlay?.createdAt;
		if (!countedAt) {
			const pausedUntil = await findVideosPausedUntil({
				db,
				size: attachment.size,
			});
			if (pausedUntil) {
				return NextResponse.json(
					{
						error:
							"Videos are paused for now while the club's viewing allowance refills.",
						resumesAt: pausedUntil.toISOString(),
					},
					{ status: 429 },
				);
			}
			const play = await db.video_playback.create({
				data: { uploadId: id, userId: user.id, bytes: attachment.size },
				select: { createdAt: true },
			});
			countedAt = play.createdAt;
		}

		const pathname = attachment.url.slice(
			attachment.url.indexOf(`uploads/${attachment.userId}/`),
		);
		const validUntil = DateTime.fromJSDate(countedAt)
			.plus({ minutes: PLAY_LINK_MINUTES })
			.toMillis();
		const { presignedUrl } = await presignUrl(
			await issueSignedToken({ pathname, operations: ["get"], validUntil }),
			{ operation: "get", pathname, access: "private", validUntil },
		);
		// The stored URL's origin and path, so the local emulator serves its own files.
		const link = new URL(attachment.url);
		link.search = new URL(presignedUrl).search;
		if (new URL(request.url).searchParams.get("download") === "1") {
			link.searchParams.set("download", "1");
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: link.toString(),
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		console.error("Error playing video:", error);
		return NextResponse.json(
			{ error: "The video couldn't be loaded. Try again." },
			{ status: 500 },
		);
	}
}
