import { randomUUID } from "node:crypto";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { DateTime } from "luxon";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { removeOrphanedUploads } from "@/domain/common/remove-orphaned-uploads";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envVars } from "@/lib/env";
import { findUploadRefusal } from "../upload-refusal";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
// Kept inside the club's 800 MB of stored files so photos and files keep their room.
const MAX_STORED_VIDEO_BYTES = 500 * 1024 * 1024;
// Firefox won't play video/quicktime, and every browser plays a MOV served as MP4.
const VIDEO_CONTENT_TYPES = new Map([
	["mp4", "video/mp4"],
	["mov", "video/mp4"],
	["m4v", "video/mp4"],
	["webm", "video/webm"],
]);
// Clean-up settles a pending upload after an hour, well past this.
const UPLOAD_PERMISSION_MINUTES = 15;

const videoRequestSchema = z.object({
	name: z.string().transform(
		(name) =>
			name
				.replace(/[\p{Cc}\p{Cf}/\\]/gu, "")
				.replace(/\s+/g, " ")
				.trim()
				.replace(/\.+$/, "")
				.replace(/^(.{0,120}).*$/u, "$1")
				.trim() || "file",
	),
	size: z.number().int().positive(),
	durationMs: z.number().int().nonnegative().optional(),
	width: z.number().int().positive().max(10_000).optional(),
	height: z.number().int().positive().max(10_000).optional(),
});

export async function POST(request: Request) {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!envVars.BLOB_READ_WRITE_TOKEN) {
		return NextResponse.json(
			{ error: "Video storage isn't set up on this server yet." },
			{ status: 503 },
		);
	}

	const parsed = videoRequestSchema.safeParse(
		await request.json().catch(() => null),
	);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "No video was attached." },
			{ status: 400 },
		);
	}
	const { name, size, durationMs, width, height } = parsed.data;
	if (size > MAX_VIDEO_BYTES) {
		return NextResponse.json(
			{ error: "That video is too large. The limit is 20 MB." },
			{ status: 413 },
		);
	}
	const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
	const contentType = VIDEO_CONTENT_TYPES.get(extension);
	if (!contentType) {
		return NextResponse.json(
			{
				error:
					"That kind of video can't be shared here. Try an MP4, MOV or WebM file.",
			},
			{ status: 415 },
		);
	}

	try {
		const refusal = await findUploadRefusal({ db, userId, size });
		if (refusal === "member-daily-count") {
			return NextResponse.json(
				{ error: "You've reached today's upload limit. Try again tomorrow." },
				{ status: 429 },
			);
		}
		if (refusal === "club-monthly-count") {
			return NextResponse.json(
				{
					error:
						"The club has reached its upload limit for now. Try again later.",
				},
				{ status: 429 },
			);
		}

		// Also when refused for space: abandoned video uploads hold it until clean-up settles them.
		after(async () => {
			try {
				await removeOrphanedUploads({ db });
			} catch (error) {
				console.error("Error removing orphaned photos:", error);
			}
		});
		if (refusal === "stored-bytes") {
			return NextResponse.json(
				{
					error:
						"The club's file storage is full. An admin can make room by deleting old messages with photos, files or videos.",
				},
				{ status: 507 },
			);
		}
		const storedVideoBytes = await db.upload.aggregate({
			where: { contentType: { not: null } },
			_sum: { size: true },
		});
		if ((storedVideoBytes._sum.size ?? 0) + size > MAX_STORED_VIDEO_BYTES) {
			return NextResponse.json(
				{
					error:
						"The club's video storage is full. An admin can make room by deleting old messages with videos.",
				},
				{ status: 507 },
			);
		}

		// Until the message is sent, the row holds the pathname the browser uploads to.
		const pathname = `uploads/${userId}/video-${randomUUID()}.${extension}`;
		const { id } = await db.upload.create({
			data: {
				userId,
				url: pathname,
				size,
				name,
				contentType,
				durationMs,
				width,
				height,
				pending: true,
			},
		});
		// The browser can read everything in this token except the signature.
		const clientToken = await generateClientTokenFromReadWriteToken({
			pathname,
			allowedContentTypes: [contentType],
			maximumSizeInBytes: size,
			validUntil: DateTime.now()
				.plus({ minutes: UPLOAD_PERMISSION_MINUTES })
				.toMillis(),
			addRandomSuffix: false,
		});

		return NextResponse.json({ id, pathname, clientToken, contentType });
	} catch (error) {
		console.error("Error preparing video upload:", error);
		return NextResponse.json(
			{ error: "The video couldn't be saved. Try again." },
			{ status: 500 },
		);
	}
}
