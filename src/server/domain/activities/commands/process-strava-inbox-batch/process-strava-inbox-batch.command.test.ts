import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedContext } from "@/domain/common/context";
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
			event: { findMany: vi.fn().mockResolvedValue([]) },
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

	it.each([
		{
			when: "takes the Strava copy's screenshot when folding it into a Concept2 row without one",
			concept2ScreenshotId: null,
			expected: "upl_strava",
		},
		{
			when: "keeps the Concept2 row's own screenshot when folding a Strava copy into it",
			concept2ScreenshotId: "upl_concept2",
			expected: "upl_concept2",
		},
	])("$when", async ({ concept2ScreenshotId, expected }) => {
		const update = vi.fn();
		const tx = {
			$executeRaw: vi.fn(),
			activity: {
				findMany: vi
					.fn()
					.mockResolvedValueOnce([
						{
							id: "act_strava",
							stravaId: "9007199254740993",
							conceptTwoId: null,
							conceptTwoData: null,
							boatId: null,
							ergId: null,
							workoutId: null,
							screenshotId: "upl_strava",
						},
						{
							id: "act_concept2",
							stravaId: null,
							conceptTwoId: BigInt(789),
							conceptTwoData: {},
							boatId: null,
							ergId: null,
							workoutId: null,
							screenshotId: concept2ScreenshotId,
						},
					])
					.mockResolvedValue([]),
				delete: vi.fn(),
				update,
			},
			activity_inbox: { update: vi.fn() },
		};
		const db = {
			activity_inbox: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				findUniqueOrThrow: vi.fn().mockResolvedValue({
					id: "batch_1",
					athleteId: "ath_1",
					payload: [
						{ ...activity, device_name: "Concept2 RowErg", external_id: "789" },
					],
				}),
			},
			$transaction: (run: (client: typeof tx) => Promise<void>) => run(tx),
		} as unknown as AuthenticatedContext["db"];

		await processStravaInboxBatchCommand({ batchId: "batch_1" }, { db });

		expect(tx.activity.delete).toHaveBeenCalledWith({
			where: { id: "act_strava" },
		});
		expect(update.mock.calls[0][0].data.screenshotId).toBe(expected);
	});

	it("attaches a new activity to the workout scheduled when it was rowed", async () => {
		const { db, tx } = createContext({ stored: [] });
		tx.event.findMany.mockResolvedValueOnce([
			{
				workoutId: "work_1",
				startAt: new Date("2026-11-01T12:30:00Z"),
				audience: "club",
				groups: [],
			},
		]);

		await processStravaInboxBatchCommand({ batchId: "batch_1" }, { db });

		expect(tx.activity.create.mock.calls[0][0].data.workout).toEqual({
			connect: { id: "work_1" },
		});
	});

	it("leaves the workout of an activity that is already stored alone", async () => {
		const { db, tx } = createContext({
			stored: [
				{
					id: "act_1",
					stravaId: "9007199254740993",
					conceptTwoId: null,
					conceptTwoData: null,
					boatId: null,
					ergId: null,
					workoutId: null,
					screenshotId: null,
				},
			],
		});

		await processStravaInboxBatchCommand({ batchId: "batch_1" }, { db });

		expect(tx.event.findMany).not.toHaveBeenCalled();
		expect(tx.activity.update.mock.calls[0][0].data).not.toHaveProperty(
			"workout",
		);
		expect(tx.activity.update.mock.calls[0][0].data).not.toHaveProperty(
			"workoutId",
		);
	});
});

function createContext({ stored }: { stored: unknown[] }) {
	const tx = {
		$executeRaw: vi.fn(),
		activity: {
			findMany: vi.fn().mockResolvedValueOnce(stored).mockResolvedValue([]),
			create: vi.fn(),
			update: vi.fn(),
		},
		event: { findMany: vi.fn().mockResolvedValue([]) },
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

	return { db, tx };
}
