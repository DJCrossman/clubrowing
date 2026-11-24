import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { envVars } from "@/lib/env";
import { createRequestContext } from "@/server/infra/trpc/request-context";
import { findViewableAttachment } from "./find-viewable-attachment";

const THUMBNAIL_DIMENSION = 720;

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, db } = await createRequestContext();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!envVars.BLOB_READ_WRITE_TOKEN) {
			return NextResponse.json(
				{ error: "Photo storage isn't set up on this server yet." },
				{ status: 503 },
			);
		}

		const attachment = await findViewableAttachment({
			db,
			user,
			id: (await params).id,
		});
		const isThumbnail =
			attachment?.name === null &&
			new URL(request.url).searchParams.get("size") === "thumbnail";
		// A video is only ever played from storage through its play link.
		const result =
			attachment &&
			!attachment.contentType &&
			(await get(attachment.url, {
				access: "private",
				// The file's ETag describes the full photo, not the thumbnail.
				ifNoneMatch: isThumbnail
					? undefined
					: (request.headers.get("If-None-Match") ?? undefined),
			}));
		if (!attachment || !result) {
			return NextResponse.json(
				{ error: "That file isn't available." },
				{ status: 404 },
			);
		}
		if (result.statusCode === 304) {
			return new Response(null, { status: 304 });
		}

		// A file is only ever a download, so an HTML or SVG file can't run on the app's origin.
		if (attachment.name !== null) {
			return new Response(result.stream, {
				headers: {
					"Content-Type": "application/octet-stream",
					"Content-Disposition": `attachment; filename="${attachment.name.replace(/[^\x20-\x7e]|["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(
						attachment.name,
					).replace(
						/['()*]/g,
						(character) =>
							`%${character.charCodeAt(0).toString(16).toUpperCase()}`,
					)}`,
					"Content-Security-Policy": "sandbox",
					ETag: result.blob.etag,
					"Cache-Control": "private, max-age=31536000, immutable",
					"X-Content-Type-Options": "nosniff",
				},
			});
		}

		if (isThumbnail) {
			const thumbnail = await sharp(
				Buffer.from(await new Response(result.stream).arrayBuffer()),
			)
				.resize({
					width: THUMBNAIL_DIMENSION,
					height: THUMBNAIL_DIMENSION,
					fit: "inside",
					withoutEnlargement: true,
				})
				.webp({ quality: 75 })
				.toBuffer();
			return new Response(new Uint8Array(thumbnail), {
				headers: {
					"Content-Type": "image/webp",
					"Cache-Control": "private, max-age=31536000, immutable",
					"X-Content-Type-Options": "nosniff",
				},
			});
		}

		return new Response(result.stream, {
			headers: {
				"Content-Type": result.blob.contentType,
				ETag: result.blob.etag,
				// Each stored file has a random name and is never overwritten.
				"Cache-Control": "private, max-age=31536000, immutable",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		console.error("Error loading photo:", error);
		return NextResponse.json(
			{ error: "The photo couldn't be loaded. Try again." },
			{ status: 500 },
		);
	}
}
