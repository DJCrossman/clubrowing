import { DateTime } from "luxon";
import { envVars } from "@/lib/env";
import type { Context } from "@/server/context";

// The storage plan stops serving every file for 30 days past 2,000 uploads in a month.
const CLUB_MONTHLY_UPLOAD_LIMIT = 1500;
// The storage plan stops serving every file for 30 days past 1 GB.
const MAX_STORED_BYTES = 800 * 1024 * 1024;

export async function findUploadRefusal({
	db,
	userId,
	size,
}: Pick<Context, "db"> & { userId: string; size: number }) {
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
		return "member-daily-count";
	}
	if (clubUploads >= CLUB_MONTHLY_UPLOAD_LIMIT) {
		return "club-monthly-count";
	}
	if ((storedBytes._sum.size ?? 0) + size > MAX_STORED_BYTES) {
		return "stored-bytes";
	}
	return null;
}
