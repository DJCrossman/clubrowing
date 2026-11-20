import { del, put } from "@vercel/blob";
import { DateTime } from "luxon";
import { after, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { envVars } from "@/lib/env";
import { removeOrphanedUploads } from "@/server/common/remove-orphaned-uploads";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_PHOTO_DIMENSION = 2560;
const MAX_SCREENSHOT_DIMENSION = 800;
// A small file can declare an enormous image; a 48-megapixel phone photo still fits.
const MAX_PHOTO_PIXELS = 50_000_000;
// The storage plan stops serving every file for 30 days past 2,000 uploads in a month.
const CLUB_MONTHLY_UPLOAD_LIMIT = 1500;
// The storage plan stops serving every file for 30 days past 1 GB.
const MAX_STORED_BYTES = 800 * 1024 * 1024;
const PHOTO_FORMATS = ["jpeg", "png", "webp"];
// Programs and installers, then scripts, then web pages.
const PROGRAM_EXTENSIONS =
	"exe msi msix dll com scr pif cpl jar apk ipa app dmg pkg deb rpm appimage bin run bat cmd ps1 psm1 vbs vbe js mjs cjs jse wsf wsh hta sh bash zsh command py pyc rb pl php lnk reg scf iso img vhd vhdx cab chm msc msp mst jnlp sct wsc xll sys appx msixbundle diagcab scpt applescript html htm xhtml xht shtml svg svgz mht mhtml url webloc".split(
		" ",
	);
// Windows and Linux programs, Mach-O and Java binaries, and script shebangs.
const PROGRAM_SIGNATURES =
	"4d5a 7f454c46 feedface feedfacf cefaedfe cffaedfe cafebabe 2321".split(" ");
const WEB_PAGE_OPENINGS = ["<!doctype html", "<html", "<script", "<svg"];
const PICTURE_EXTENSIONS =
	"jpg jpeg png webp gif heic heif avif tif tiff bmp".split(" ");

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

	if (!(file instanceof File) || file.size === 0) {
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
		const [memberUploads, clubUploads, storedBytes] = await Promise.all([
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
			db.upload.aggregate({ _sum: { size: true } }),
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
		if ((storedBytes._sum.size ?? 0) + file.size > MAX_STORED_BYTES) {
			return NextResponse.json(
				{
					error:
						"The club's file storage is full. An admin can make room by deleting old messages with photos or files.",
				},
				{ status: 507 },
			);
		}

		const kind = formData?.get("kind");
		const name =
			file.name
				.replace(/[\p{Cc}\p{Cf}/\\]/gu, "")
				.replace(/\s+/g, " ")
				.trim()
				.replace(/\.+$/, "")
				.replace(/^(.{0,120}).*$/u, "$1")
				.trim() || "file";
		const bytes = Buffer.from(await file.arrayBuffer());
		if (kind === "file" && isProgram({ name, bytes })) {
			return NextResponse.json(
				{ error: "Programs, scripts and web pages can't be shared here." },
				{ status: 400 },
			);
		}
		if (
			kind === "file" &&
			(PICTURE_EXTENSIONS.some((extension) =>
				name.toLowerCase().endsWith(`.${extension}`),
			) ||
				(await sharp(bytes)
					.metadata()
					.then(
						() => true,
						() => false,
					)))
		) {
			return NextResponse.json(
				{
					error: "Add that picture as a photo so its location data is removed.",
				},
				{ status: 400 },
			);
		}

		// A file is kept byte for byte and only ever offered as a download.
		const stored =
			kind === "file"
				? bytes
				: await storablePhoto({
						bytes,
						maxDimension:
							kind === "screenshot"
								? MAX_SCREENSHOT_DIMENSION
								: MAX_PHOTO_DIMENSION,
					});
		if (!stored) {
			return NextResponse.json(
				{
					error: "That file isn't a photo we can use. Try a JPEG, PNG or WebP.",
				},
				{ status: 400 },
			);
		}

		const { url } = await put(
			`uploads/${userId}/${kind === "file" ? "file" : "photo.webp"}`,
			stored,
			{
				access: "private",
				addRandomSuffix: true,
				contentType:
					kind === "file" ? "application/octet-stream" : "image/webp",
			},
		);
		// A stored file without a row could never be found or deleted.
		const { id } = await db.upload
			.create({
				data: {
					userId,
					url,
					size: stored.length,
					...(kind === "file" && { name }),
				},
			})
			.catch(async (error) => {
				await del(url);
				throw error;
			});

		after(async () => {
			try {
				await removeOrphanedUploads({ db });
			} catch (error) {
				console.error("Error removing orphaned photos:", error);
			}
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
	bytes,
	maxDimension,
}: {
	bytes: Buffer;
	maxDimension: number;
}) {
	try {
		const image = sharp(bytes, {
			limitInputPixels: MAX_PHOTO_PIXELS,
		});
		const { format } = await image.metadata();
		if (!format || !PHOTO_FORMATS.includes(format)) {
			return null;
		}
		image.rotate();
		image.resize({
			width: maxDimension,
			height: maxDimension,
			fit: "inside",
			withoutEnlargement: true,
		});
		return await image.webp({ quality: 80 }).toBuffer();
	} catch {
		return null;
	}
}

// A deny-list by name and leading bytes, not a malware scan.
function isProgram({ name, bytes }: { name: string; bytes: Buffer }) {
	const head = bytes
		.subarray(0, 1024)
		.toString("utf8")
		.trimStart()
		.toLowerCase();
	return (
		PROGRAM_EXTENSIONS.some((extension) =>
			name.toLowerCase().endsWith(`.${extension}`),
		) ||
		PROGRAM_SIGNATURES.some((signature) =>
			bytes.subarray(0, 4).toString("hex").startsWith(signature),
		) ||
		WEB_PAGE_OPENINGS.some((opening) => head.startsWith(opening)) ||
		(head.startsWith("<?xml") && /<(svg|html)/.test(head))
	);
}
