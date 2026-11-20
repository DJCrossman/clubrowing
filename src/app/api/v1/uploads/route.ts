import { del, put } from "@vercel/blob";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envVars } from "@/lib/env";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_RESIZED_DIMENSION = 800;
// A small file can declare an enormous image; a 48-megapixel phone photo still fits.
const MAX_PHOTO_PIXELS = 50_000_000;
// The storage plan stops serving every file for 30 days past 2,000 uploads in a month.
const CLUB_MONTHLY_UPLOAD_LIMIT = 1500;
const PHOTO_FORMATS = ["jpeg", "png", "webp"];

export async function POST(request: Request) {
	let userId: string;
	try {
		userId = await requireAuth();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!envVars.BLOB_READ_WRITE_TOKEN) {
		return NextResponse.json(
			{ error: "Photo storage isn't set up on this server yet." },
			{ status: 503 },
		);
	}

	const formData = await request.formData().catch(() => null);
	const file = formData?.get("file");

	if (!(file instanceof File)) {
		return NextResponse.json(
			{ error: "No photo was attached." },
			{ status: 400 },
		);
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		return NextResponse.json(
			{ error: "That photo is too large. The limit is 4 MB." },
			{ status: 413 },
		);
	}

	try {
		const [memberUploads, clubUploads] = await Promise.all([
			db.upload.count({
				where: {
					userId,
					createdAt: { gte: DateTime.now().minus({ days: 1 }).toJSDate() },
				},
			}),
			db.upload.count({
				where: {
					createdAt: { gte: DateTime.now().minus({ days: 30 }).toJSDate() },
				},
			}),
		]);
		if (memberUploads >= envVars.MEMBER_DAILY_UPLOAD_LIMIT) {
			return NextResponse.json(
				{ error: "You've reached today's photo limit. Try again tomorrow." },
				{ status: 429 },
			);
		}
		if (clubUploads >= CLUB_MONTHLY_UPLOAD_LIMIT) {
			return NextResponse.json(
				{
					error:
						"The club has reached its photo limit for now. Try again later.",
				},
				{ status: 429 },
			);
		}

		const photo = await storablePhoto({
			file,
			shouldResize: formData?.get("kind") === "screenshot",
		});
		if (!photo) {
			return NextResponse.json(
				{
					error: "That file isn't a photo we can use. Try a JPEG, PNG or WebP.",
				},
				{ status: 400 },
			);
		}

		const { url } = await put(`uploads/${userId}/photo.webp`, photo, {
			access: "private",
			addRandomSuffix: true,
			contentType: "image/webp",
		});
		// A stored photo without a row could never be found or deleted.
		const { id } = await db.upload
			.create({ data: { userId, url, size: photo.length } })
			.catch(async (error) => {
				await del(url);
				throw error;
			});

		return NextResponse.json({ id });
	} catch (error) {
		console.error("Error uploading photo:", error);
		return NextResponse.json(
			{ error: "The photo couldn't be saved. Try again." },
			{ status: 500 },
		);
	}
}

// Only these re-encoded bytes are stored, so EXIF (GPS included) and anything
// hidden in or appended to the original never reach storage.
async function storablePhoto({
	file,
	shouldResize,
}: {
	file: File;
	shouldResize: boolean;
}) {
	try {
		const image = sharp(Buffer.from(await file.arrayBuffer()), {
			limitInputPixels: MAX_PHOTO_PIXELS,
		});
		const { format } = await image.metadata();
		if (!format || !PHOTO_FORMATS.includes(format)) {
			return null;
		}
		image.rotate();
		if (shouldResize) {
			image.resize({
				width: MAX_RESIZED_DIMENSION,
				height: MAX_RESIZED_DIMENSION,
				fit: "inside",
				withoutEnlargement: true,
			});
		}
		return await image.webp({ quality: 80 }).toBuffer();
	} catch {
		return null;
	}
}
