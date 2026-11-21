import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/server/context";
import { getAnalyticsQuery } from "./get-analytics.query";

// Wednesday, mid-afternoon in Regina, so no activity sits near a day or week boundary.
const NOW = new Date("2026-06-17T20:00:00.000Z");

describe("getAnalyticsQuery", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("totals only the week so far, counted from Sunday", async () => {
		const { analyticMetrics } = await getAnalyticsQuery(
			undefined,
			createContext([
				activity({ daysAgo: 1, distance: 1000 }),
				activity({ daysAgo: 3, distance: 2000 }),
				activity({ daysAgo: 4, distance: 4000 }),
				activity({ daysAgo: 11, distance: 8000 }),
			]),
		);

		expect(analyticMetrics.totalMeters.amount).toBe(3000);
		expect(analyticMetrics.totalActivities.amount).toBe(2);
		expect(analyticMetrics.totalDuration.amount).toBe(1200);
	});

	it("compares the week so far with the whole week before it", async () => {
		const { analyticMetrics } = await getAnalyticsQuery(
			undefined,
			createContext([
				activity({ daysAgo: 1, distance: 1000 }),
				activity({ daysAgo: 4, distance: 4000 }),
				activity({ daysAgo: 10, distance: 2000 }),
				activity({ daysAgo: 11, distance: 8000 }),
			]),
		);

		expect(analyticMetrics.totalMeters.change).toBe(-5000);
		expect(analyticMetrics.totalActivities.change).toBe(-1);
	});

	it("keeps Saturday evening in Regina in the week that began on Sunday", async () => {
		// 8 pm on Saturday June 20 in Regina, already Sunday in UTC.
		vi.setSystemTime(new Date("2026-06-21T02:00:00.000Z"));

		const { analyticMetrics } = await getAnalyticsQuery(
			undefined,
			createContext([
				activity({ daysAgo: 0, distance: 1000 }),
				activity({ daysAgo: 6, distance: 2000 }),
				activity({ daysAgo: 7, distance: 4000 }),
			]),
		);

		expect(analyticMetrics.totalMeters.amount).toBe(3000);
		expect(
			analyticMetrics.activeStreak.weekDays
				.filter((day) => day.hasActivity)
				.map((day) => day.date),
		).toEqual(["2026-06-14", "2026-06-20"]);
	});
});

function createContext(activities: ReturnType<typeof activity>[]) {
	const db = {
		activity: {
			aggregate: vi.fn(
				async ({
					where,
				}: {
					where: { startDate: { gte: Date; lt?: Date } };
				}) => {
					const inRange = activities.filter(
						({ startDate }) =>
							startDate >= where.startDate.gte &&
							(!where.startDate.lt || startDate < where.startDate.lt),
					);
					return {
						_sum: {
							distance: inRange.reduce((sum, row) => sum + row.distance, 0),
							elapsedTime: inRange.reduce(
								(sum, row) => sum + row.elapsedTime,
								0,
							),
						},
						_count: { id: inRange.length },
					};
				},
			),
			findMany: vi.fn(async ({ where }: { where: { type?: string } }) =>
				where.type ? [] : activities,
			),
		},
	};
	return { db, athlete: { id: "ath_ann" } } as unknown as ViewerContext;
}

function activity({
	daysAgo,
	distance,
}: {
	daysAgo: number;
	distance: number;
}) {
	return {
		distance,
		elapsedTime: 600,
		startDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
	};
}
