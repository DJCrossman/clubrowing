import { describe, expect, it } from "vitest";
import { findScheduledWorkoutId } from "./findScheduledWorkoutId";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const SESSION_START = Date.parse("2026-11-02T12:00:00.000Z");

const session = {
	id: "work_session",
	eventId: "evt_session",
	startDate: new Date(SESSION_START).toISOString(),
};

describe("findScheduledWorkoutId", () => {
	it.each([
		["10 minutes before it starts", -10 * MINUTE],
		["as it starts", 0],
		["just under 2 hours after it starts", 2 * HOUR - 1],
	])("proposes a session's workout for an activity started %s", (_, offset) => {
		expect(
			findScheduledWorkoutId({
				workouts: [{ ...session, activityType: "erg" }],
				type: "erg",
				startDate: new Date(SESSION_START + offset).toISOString(),
			}),
		).toBe("work_session");
	});

	it.each([
		["more than 10 minutes before it starts", -10 * MINUTE - 1],
		["2 hours after it starts", 2 * HOUR],
	])("proposes nothing for an activity started %s", (_, offset) => {
		expect(
			findScheduledWorkoutId({
				workouts: [{ ...session, activityType: "erg" }],
				type: "erg",
				startDate: new Date(SESSION_START + offset).toISOString(),
			}),
		).toBeUndefined();
	});

	it("skips a workout for the other activity type", () => {
		expect(
			findScheduledWorkoutId({
				workouts: [{ ...session, activityType: "water" }],
				type: "erg",
				startDate: new Date(SESSION_START + 15 * MINUTE).toISOString(),
			}),
		).toBeUndefined();
	});

	it("skips a workout that belongs to no session", () => {
		expect(
			findScheduledWorkoutId({
				workouts: [{ ...session, eventId: null, activityType: "erg" }],
				type: "erg",
				startDate: new Date(SESSION_START + 15 * MINUTE).toISOString(),
			}),
		).toBeUndefined();
	});

	it("takes the session whose start is closest", () => {
		expect(
			findScheduledWorkoutId({
				workouts: [
					{ ...session, activityType: "erg" },
					{
						id: "work_later",
						eventId: "evt_later",
						activityType: "erg",
						startDate: new Date(SESSION_START + HOUR).toISOString(),
					},
				],
				type: "erg",
				startDate: new Date(SESSION_START + 55 * MINUTE).toISOString(),
			}),
		).toBe("work_later");
	});
});
