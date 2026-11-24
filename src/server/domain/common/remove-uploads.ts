import type { Context } from "@/domain/common/context";

export async function removeUploads({
	db,
	services,
	uploads,
}: Pick<Context, "db"> & {
	services: Pick<Context["services"], "fileStorage">;
	uploads: { id: string; url: string }[];
}) {
	if (uploads.length === 0) return;
	// Looked up first: once the files' rows are gone, their previews no longer point at them.
	const removed = [
		...uploads,
		...(await db.upload.findMany({
			where: { previewOfId: { in: uploads.map((upload) => upload.id) } },
			select: { id: true, url: true },
		})),
	];
	await services.fileStorage.deleteFiles(removed.map((upload) => upload.url));
	await db.upload.deleteMany({
		where: { id: { in: removed.map((upload) => upload.id) } },
	});
}
