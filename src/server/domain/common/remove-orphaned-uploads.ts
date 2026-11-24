import { DateTime } from "luxon";
import type { Context } from "@/domain/common/context";
import type { StoredFile } from "@/server/services/file-storage";
import { removeUploads } from "./remove-uploads";
import { storedFileMatches } from "./stored-file-matches";

// Well past the 15 minutes a video's upload permission lasts.
const UNFINISHED_UPLOAD_HOURS = 1;

export async function removeOrphanedUploads({
	db,
	services,
}: Pick<Context, "db"> & {
	services: Pick<Context["services"], "fileStorage">;
}) {
	const uploads = await db.upload.findMany({
		// Every feature that keeps uploads must be named in this condition, or its files are removed as orphans.
		where: {
			OR: [
				{
					messageId: null,
					activity: null,
					previewOf: null,
					createdAt: { lt: DateTime.now().minus({ hours: 24 }).toJSDate() },
				},
				{ message: { deletedAt: { not: null } } },
				{
					pending: true,
					createdAt: {
						lt: DateTime.now()
							.minus({ hours: UNFINISHED_UPLOAD_HOURS })
							.toJSDate(),
					},
				},
			],
		},
		orderBy: { createdAt: "asc" },
		take: 20,
		select: {
			id: true,
			url: true,
			size: true,
			contentType: true,
			pending: true,
		},
	});
	for (const upload of uploads.filter((upload) => upload.pending)) {
		await settleUnfinishedUpload({ db, services, upload });
	}
	await removeUploads({
		db,
		services,
		uploads: uploads.filter((upload) => !upload.pending),
	});
}

// A settled upload is an ordinary unsent one: counted, sendable, and removed at 24 hours.
async function settleUnfinishedUpload({
	db,
	services,
	upload,
}: Pick<Context, "db"> & {
	services: Pick<Context["services"], "fileStorage">;
	upload: { id: string; url: string; size: number; contentType: string | null };
}) {
	let stored: StoredFile | null;
	try {
		stored = await services.fileStorage.findFile(upload.url);
	} catch (error) {
		console.error("Error checking an unfinished upload:", error);
		return;
	}
	if (!stored) {
		// A send that confirmed the row in the meantime keeps it.
		await db.upload.deleteMany({ where: { id: upload.id, pending: true } });
		return;
	}
	if (storedFileMatches({ stored, upload })) {
		await db.upload.updateMany({
			where: { id: upload.id, pending: true },
			data: { url: stored.url, size: stored.size, pending: false },
		});
		return;
	}
	try {
		await services.fileStorage.deleteFile(stored.url);
	} catch (error) {
		console.error("Error removing an unfinished upload:", error);
		return;
	}
	await db.upload.deleteMany({ where: { id: upload.id, pending: true } });
}
