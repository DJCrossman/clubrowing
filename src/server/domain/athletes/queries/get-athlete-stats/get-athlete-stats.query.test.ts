import { describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/domain/common/context";
import { getAthleteStatsQuery } from "./get-athlete-stats.query";

describe("getAthleteStatsQuery", () => {
	it.each([
		2000, 6000,
	])("celebrates a latest %i m test faster than every earlier one", async (distance) => {
		const result = await getAthleteStatsQuery(
			{ athleteId: "ath_me" },
			createContext([
				activity({ daysAgo: 30, distance, elapsedTime: 4300 }),
				activity({ daysAgo: 10, distance, elapsedTime: 4250 }),
				activity({ daysAgo: 1, distance, elapsedTime: 4200 }),
			]),
		);

		expect(result.isCelebratingPersonalBest).toBe(true);
	});

	it.each([
		[
			"a first-ever test",
			[activity({ daysAgo: 1, distance: 2000, elapsedTime: 4200 })],
		],
		[
			"a slower time",
			[
				activity({ daysAgo: 10, distance: 2000, elapsedTime: 4200 }),
				activity({ daysAgo: 1, distance: 2000, elapsedTime: 4300 }),
			],
		],
		[
			"an equal time",
			[
				activity({ daysAgo: 10, distance: 2000, elapsedTime: 4200 }),
				activity({ daysAgo: 1, distance: 2000, elapsedTime: 4200 }),
			],
		],
		[
			"a faster 2000 m interval session",
			[
				activity({ daysAgo: 10, distance: 2000, elapsedTime: 4200 }),
				activity({
					daysAgo: 1,
					distance: 2000,
					elapsedTime: 3900,
					conceptTwoData: { workout_type: "FixedDistanceInterval" },
				}),
			],
		],
	])("does not celebrate %s", async (_, activities) => {
		const result = await getAthleteStatsQuery(
			{ athleteId: "ath_me" },
			createContext(activities),
		);

		expect(result.isCelebratingPersonalBest).toBe(false);
	});

	it("stops celebrating once a later activity is logged", async () => {
		const result = await getAthleteStatsQuery(
			{ athleteId: "ath_me" },
			createContext([
				activity({ daysAgo: 10, distance: 2000, elapsedTime: 4300 }),
				activity({ daysAgo: 2, distance: 2000, elapsedTime: 4200 }),
				activity({
					daysAgo: 1,
					type: "crossTrain",
					distance: 5000,
					elapsedTime: 15000,
				}),
			]),
		);

		expect(result.isCelebratingPersonalBest).toBe(false);
	});

	it("leaves a hidden test out of the last and best results", async () => {
		const result = await getAthleteStatsQuery(
			{ athleteId: "ath_me" },
			createContext([
				activity({ daysAgo: 10, distance: 2000, elapsedTime: 4300 }),
				activity({
					daysAgo: 1,
					distance: 2000,
					elapsedTime: 4200,
					isHidden: true,
				}),
			]),
		);

		expect(result.lastTwoKmRaceDuration?.activityId).toBe("act_10");
		expect(result.bestTwoKmRaceDuration?.activityId).toBe("act_10");
		expect(result.isCelebratingPersonalBest).toBe(false);
	});
});

function activity({
	daysAgo,
	type = "erg",
	distance,
	elapsedTime,
	conceptTwoData = { workout_type: "FixedDistanceSplits" },
	isHidden = false,
}: {
	daysAgo: number;
	type?: string;
	distance: number;
	elapsedTime: number;
	conceptTwoData?: unknown;
	isHidden?: boolean;
}) {
	return {
		id: `act_${daysAgo}`,
		type,
		distance,
		elapsedTime,
		startDate: new Date(Date.UTC(2026, 5, 30 - daysAgo)),
		conceptTwoData,
		isHidden,
	};
}

function createContext(activities: ReturnType<typeof activity>[]) {
	const newestFirst = activities.toSorted(
		(a, b) => b.startDate.getTime() - a.startDate.getTime(),
	);
	const db = {
		activity: {
			findMany: vi.fn(async () => newestFirst.filter((a) => a.type === "erg")),
			findFirst: vi.fn(async () => newestFirst[0] ?? null),
		},
	};
	return { db } as unknown as Context;
}
