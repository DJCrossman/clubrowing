import { del } from "@vercel/blob";
import type { Context } from "@/server/context";

export async function removeUploads({
	db,
	uploads,
}: Pick<Context, "db"> & { uploads: { id: string; url: string }[] }) {
	if (uploads.length === 0) return;
	// Looked up first: once the files' rows are gone, their previews no longer point at them.
	const removed = [
		...uploads,
		...(await db.upload.findMany({
			where: { previewOfId: { in: uploads.map((upload) => upload.id) } },
			select: { id: true, url: true },
		})),
	];
	await del(removed.map((upload) => upload.url));
	await db.upload.deleteMany({
		where: { id: { in: removed.map((upload) => upload.id) } },
	});
}
