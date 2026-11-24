import { DateTime } from "luxon";
import { describe, expect, it, vi } from "vitest";
import type { Context } from "@/domain/common/context";
import { findVideosPausedUntil } from "./videos-paused-until";

const gigabyte = 1024 * 1024 * 1024;
const now = DateTime.fromISO("2026-11-20T12:00:00Z");

describe("findVideosPausedUntil", () => {
	it("lets a video play while it fits in the last 30 days' allowance", async () => {
		const db = playedBefore([
			{ bytes: 3 * gigabyte, createdAt: now.minus({ days: 20 }) },
			{ bytes: 3 * gigabyte - 1000, createdAt: now.minus({ days: 2 }) },
		]);

		expect(await findVideosPausedUntil({ db, size: 1000 })).toBe(null);
	});

	it("pauses videos until enough of the oldest plays leave the window", async () => {
		const db = playedBefore([
			{ bytes: 1000, createdAt: now.minus({ days: 25 }) },
			{ bytes: 2000, createdAt: now.minus({ days: 20 }) },
			{ bytes: 6 * gigabyte - 3000, createdAt: now.minus({ days: 1 }) },
		]);

		expect(await findVideosPausedUntil({ db, size: 2500 })).toEqual(
			now.minus({ days: 20 }).plus({ days: 30 }).toJSDate(),
		);
	});

	it("pauses only until the first play leaves when that makes room", async () => {
		const db = playedBefore([
			{ bytes: 5000, createdAt: now.minus({ days: 29 }) },
			{ bytes: 6 * gigabyte - 5000, createdAt: now.minus({ days: 1 }) },
		]);

		expect(await findVideosPausedUntil({ db, size: 5000 })).toEqual(
			now.minus({ days: 29 }).plus({ days: 30 }).toJSDate(),
		);
	});

	it("sums the plays of the last 30 days without loading them while there is room", async () => {
		const db = playedBefore([]);
		const before = Date.now();

		await findVideosPausedUntil({ db, size: 1 });

		const [{ where }] = db.video_playback.aggregate.mock.calls[0];
		expect(
			Math.abs(
				before - 30 * 24 * 60 * 60 * 1000 - where.createdAt.gte.getTime(),
			),
		).toBeLessThan(5000);
		expect(db.video_playback.findMany).not.toHaveBeenCalled();
	});

	it("loads the plays oldest first once the allowance is used up", async () => {
		const db = playedBefore([
			{ bytes: 6 * gigabyte, createdAt: now.minus({ days: 1 }) },
		]);

		await findVideosPausedUntil({ db, size: 1 });

		const [{ orderBy }] = db.video_playback.findMany.mock.calls[0];
		expect(orderBy).toEqual({ createdAt: "asc" });
	});
});

function playedBefore(plays: { bytes: number; createdAt: DateTime }[]) {
	const findMany = vi.fn(
		async (_query: {
			where: { createdAt: { gte: Date } };
			orderBy: { createdAt: "asc" };
		}) =>
			plays.map(({ bytes, createdAt }) => ({
				bytes,
				createdAt: createdAt.toJSDate(),
			})),
	);
	const aggregate = vi.fn(
		async (_query: { where: { createdAt: { gte: Date } } }) => ({
			_sum: { bytes: plays.reduce((total, play) => total + play.bytes, 0) },
		}),
	);
	return {
		video_playback: { aggregate, findMany },
	} as unknown as Context["db"] & {
		video_playback: { aggregate: typeof aggregate; findMany: typeof findMany };
	};
}
