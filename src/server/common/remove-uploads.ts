import { del } from "@vercel/blob";
import type { Context } from "@/server/context";

export async function removeUploads({
	db,
	uploads,
}: Pick<Context, "db"> & { uploads: { id: string; url: string }[] }) {
	if (uploads.length === 0) return;
	await del(uploads.map((upload) => upload.url));
	await db.upload.deleteMany({
		where: { id: { in: uploads.map((upload) => upload.id) } },
	});
}
