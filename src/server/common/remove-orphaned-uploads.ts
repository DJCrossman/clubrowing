import { DateTime } from "luxon";
import type { Context } from "@/server/context";
import { removeUploads } from "./remove-uploads";

export async function removeOrphanedUploads({ db }: Pick<Context, "db">) {
	await removeUploads({
		db,
		uploads: await db.upload.findMany({
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
				],
			},
			orderBy: { createdAt: "asc" },
			take: 20,
			select: { id: true, url: true },
		}),
	});
}
