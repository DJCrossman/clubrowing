import { DateTime } from "luxon";
import type { Context } from "@/server/context";

// The storage plan stops serving every file for 30 days past 10 GB of transfer, and
// photos, files and repeated range requests need the rest.
const MAX_VIDEO_PLAYBACK_BYTES = 6 * 1024 * 1024 * 1024;
const VIDEO_PLAYBACK_WINDOW_DAYS = 30;

// When a video of this size may next be played, or null when it may be played now.
export async function findVideosPausedUntil({
	db,
	size,
}: Pick<Context, "db"> & { size: number }) {
	const inWindow = {
		createdAt: {
			gte: DateTime.now()
				.minus({ days: VIDEO_PLAYBACK_WINDOW_DAYS })
				.toJSDate(),
		},
	};
	// The messages query asks this on every poll, so the usual answer costs one sum.
	const played = await db.video_playback.aggregate({
		where: inWindow,
		_sum: { bytes: true },
	});
	let counted = played._sum.bytes ?? 0;
	if (counted + size <= MAX_VIDEO_PLAYBACK_BYTES) return null;
	const plays = await db.video_playback.findMany({
		where: inWindow,
		orderBy: { createdAt: "asc" },
		select: { bytes: true, createdAt: true },
	});
	for (const play of plays) {
		counted -= play.bytes;
		if (counted + size <= MAX_VIDEO_PLAYBACK_BYTES) {
			return DateTime.fromJSDate(play.createdAt)
				.plus({ days: VIDEO_PLAYBACK_WINDOW_DAYS })
				.toJSDate();
		}
	}
	return DateTime.now().plus({ days: VIDEO_PLAYBACK_WINDOW_DAYS }).toJSDate();
}
