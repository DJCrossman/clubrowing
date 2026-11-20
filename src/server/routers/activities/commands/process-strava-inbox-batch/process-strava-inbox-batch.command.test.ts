import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedContext } from "@/server/context";
import { processStravaInboxBatchCommand } from "./process-strava-inbox-batch.command";

const activity = {
	// 9007199254740993 read as a JSON number rounds to 2 ** 53.
	id: 2 ** 53,
	id_str: "9007199254740993",
	resource_state: 2,
	athlete: { id: 456, resource_state: 1 },
	name: "Morning Row",
	distance: 8000,
	moving_time: 2100,
	elapsed_time: 2200,
	total_elevation_gain: 0,
	type: "Rowing",
	sport_type: "Rowing",
	start_date: "2026-11-01T13:00:00Z",
	start_date_local: "2026-11-01T07:00:00Z",
	timezone: "(GMT-06:00) America/Regina",
	utc_offset: -21600,
	achievement_count: 0,
	kudos_count: 0,
	comment_count: 0,
	athlete_count: 1,
	photo_count: 0,
	map: { id: "a123", resource_state: 2 },
	trainer: false,
	commute: false,
	manual: false,
	private: false,
	visibility: "everyone",
	flagged: false,
	average_speed: 3.6,
	max_speed: 4.2,
};

describe("processStravaInboxBatchCommand", () => {
	it("stores the exact Strava id from id_str", async () => {
		const create = vi.fn();
		const tx = {
			$executeRaw: vi.fn(),
			activity: { findMany: vi.fn().mockResolvedValue([]), create },
			activity_inbox: { update: vi.fn() },
		};
		const db = {
			activity_inbox: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				findUniqueOrThrow: vi.fn().mockResolvedValue({
					id: "batch_1",
					athleteId: "ath_1",
					payload: [activity],
				}),
			},
			$transaction: (run: (client: typeof tx) => Promise<void>) => run(tx),
		} as unknown as AuthenticatedContext["db"];

		await processStravaInboxBatchCommand({ batchId: "batch_1" }, { db });

		expect(create.mock.calls[0][0].data.stravaId).toBe("9007199254740993");
	});
});
