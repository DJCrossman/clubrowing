import { describe, expect, it, vi } from "vitest";
import {
	attachLoggedActivitiesToWorkout,
	findScheduledWorkoutForActivity,
} from "./scheduled-workout";

const MINUTE_MS = 60 * 1000;
const startAt = new Date("2026-11-03T12:00:00Z");

type ScheduledEvent = {
	workoutId: string;
	startAt: Date;
	audience: "club" | "groups";
	groups: { groupId: string }[];
	activityType: "water" | "erg";
};

const clubErgEvent: ScheduledEvent = {
	workoutId: "work_1",
	startAt,
	audience: "club",
	groups: [],
	activityType: "erg",
};

type LoggedActivity = {
	id: string;
	athleteId: string;
	type: "water" | "erg";
	startDate: Date;
	workoutId: string | null;
};

type FakeSchedule = {
	events: ScheduledEvent[];
	athleteGroupIds?: string[];
	activities?: LoggedActivity[];
};

const loggedErg: LoggedActivity = {
	id: "act_1",
	athleteId: "ath_1",
	type: "erg",
	startDate: new Date(startAt.getTime() + 30 * MINUTE_MS),
	workoutId: null,
};

describe("findScheduledWorkoutForActivity", () => {
	it.each([
		{
			when: "half an hour after it",
			offsetMs: 30 * MINUTE_MS,
			expected: "work_1",
		},
		{
			when: "ten minutes before it",
			offsetMs: -10 * MINUTE_MS,
			expected: "work_1",
		},
		{
			when: "just over ten minutes before it",
			offsetMs: -10 * MINUTE_MS - 1,
			expected: null,
		},
		{
			when: "just under two hours after it",
			offsetMs: 120 * MINUTE_MS - 1,
			expected: "work_1",
		},
		{
			when: "two hours after it",
			offsetMs: 120 * MINUTE_MS,
			expected: null,
		},
	])("an activity starting $when gets $expected", async ({
		offsetMs,
		expected,
	}) => {
		const db = createDb({ events: [clubErgEvent] });

		const workoutId = await findScheduledWorkoutForActivity({
			db,
			athleteId: "ath_1",
			activity: {
				type: "erg",
				startDate: new Date(startAt.getTime() + offsetMs),
			},
		});

		expect(workoutId).toBe(expected);
	});

	it("ignores a workout of another activity type", async () => {
		const db = createDb({
			events: [{ ...clubErgEvent, activityType: "water" }],
		});

		const workoutId = await findScheduledWorkoutForActivity({
			db,
			athleteId: "ath_1",
			activity: { type: "erg", startDate: startAt },
		});

		expect(workoutId).toBeNull();
	});

	it("ignores an event for groups the athlete is not in", async () => {
		const db = createDb({
			events: [
				{
					...clubErgEvent,
					audience: "groups",
					groups: [{ groupId: "grp_juniors" }],
				},
			],
			athleteGroupIds: ["grp_masters"],
		});

		const workoutId = await findScheduledWorkoutForActivity({
			db,
			athleteId: "ath_1",
			activity: { type: "erg", startDate: startAt },
		});

		expect(workoutId).toBeNull();
	});

	it("links an event for a group the athlete is in", async () => {
		const db = createDb({
			events: [
				{
					...clubErgEvent,
					audience: "groups",
					groups: [{ groupId: "grp_juniors" }, { groupId: "grp_masters" }],
				},
			],
			athleteGroupIds: ["grp_masters"],
		});

		const workoutId = await findScheduledWorkoutForActivity({
			db,
			athleteId: "ath_1",
			activity: { type: "erg", startDate: startAt },
		});

		expect(workoutId).toBe("work_1");
	});

	it("treats a group event with no groups left as club-wide", async () => {
		const db = createDb({
			events: [{ ...clubErgEvent, audience: "groups", groups: [] }],
		});

		const workoutId = await findScheduledWorkoutForActivity({
			db,
			athleteId: "ath_1",
			activity: { type: "erg", startDate: startAt },
		});

		expect(workoutId).toBe("work_1");
	});

	it("takes the event that starts closest to the activity", async () => {
		const db = createDb({
			events: [
				clubErgEvent,
				{
					...clubErgEvent,
					workoutId: "work_2",
					startAt: new Date(startAt.getTime() + 90 * MINUTE_MS),
				},
			],
		});

		const workoutId = await findScheduledWorkoutForActivity({
			db,
			athleteId: "ath_1",
			activity: {
				type: "erg",
				startDate: new Date(startAt.getTime() + 85 * MINUTE_MS),
			},
		});

		expect(workoutId).toBe("work_2");
	});
});

describe("attachLoggedActivitiesToWorkout", () => {
	it("attaches the unattached activities logged during the session", async () => {
		const { db, tx } = createTransactionDb({
			events: [clubErgEvent],
			activities: [
				loggedErg,
				{
					...loggedErg,
					id: "act_2",
					athleteId: "ath_2",
					startDate: new Date(startAt.getTime() - 5 * MINUTE_MS),
				},
				{
					...loggedErg,
					id: "act_later",
					startDate: new Date(startAt.getTime() + 120 * MINUTE_MS),
				},
				{ ...loggedErg, id: "act_water", type: "water" },
			],
		});

		const count = await attachLoggedActivitiesToWorkout({
			db,
			event: { workoutId: "work_1", startAt, activityType: "erg" },
		});

		expect(count).toBe(2);
		expect(tx.activity.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["act_1", "act_2"] }, workoutId: null },
			data: { workoutId: "work_1" },
		});
	});

	it("leaves an activity that already has a workout alone", async () => {
		const { db, tx } = createTransactionDb({
			events: [clubErgEvent],
			activities: [{ ...loggedErg, workoutId: "work_picked" }],
		});

		const count = await attachLoggedActivitiesToWorkout({
			db,
			event: { workoutId: "work_1", startAt, activityType: "erg" },
		});

		expect(count).toBe(0);
		expect(tx.activity.updateMany).not.toHaveBeenCalled();
	});

	it("looks for nothing when the session starts more than ten minutes from now", async () => {
		const later = new Date(Date.now() + 15 * MINUTE_MS);
		const { db, tx } = createTransactionDb({
			events: [{ ...clubErgEvent, startAt: later }],
			activities: [{ ...loggedErg, startDate: later }],
		});

		const count = await attachLoggedActivitiesToWorkout({
			db,
			event: { workoutId: "work_1", startAt: later, activityType: "erg" },
		});

		expect(count).toBe(0);
		expect(db.$transaction).not.toHaveBeenCalled();
		expect(tx.activity.findMany).not.toHaveBeenCalled();
	});

	it("leaves an activity that started closer to another session alone", async () => {
		const { db, tx } = createTransactionDb({
			events: [
				clubErgEvent,
				{
					...clubErgEvent,
					workoutId: "work_2",
					startAt: new Date(startAt.getTime() + 90 * MINUTE_MS),
				},
			],
			activities: [
				{
					...loggedErg,
					startDate: new Date(startAt.getTime() + 85 * MINUTE_MS),
				},
			],
		});

		const count = await attachLoggedActivitiesToWorkout({
			db,
			event: { workoutId: "work_1", startAt, activityType: "erg" },
		});

		expect(count).toBe(0);
		expect(tx.activity.updateMany).not.toHaveBeenCalled();
	});

	it("leaves the activity of an athlete outside the session's groups alone", async () => {
		const { db, tx } = createTransactionDb({
			events: [
				{
					...clubErgEvent,
					audience: "groups",
					groups: [{ groupId: "grp_juniors" }],
				},
			],
			athleteGroupIds: ["grp_masters"],
			activities: [loggedErg],
		});

		const count = await attachLoggedActivitiesToWorkout({
			db,
			event: { workoutId: "work_1", startAt, activityType: "erg" },
		});

		expect(count).toBe(0);
		expect(tx.activity.updateMany).not.toHaveBeenCalled();
	});
});

function createDb(schedule: FakeSchedule) {
	// A hand-built fake can't satisfy Prisma's generated delegate types.
	return createTx(schedule) as unknown as Parameters<
		typeof findScheduledWorkoutForActivity
	>[0]["db"];
}

function createTransactionDb(schedule: FakeSchedule) {
	const tx = createTx(schedule);
	return {
		db: { $transaction: vi.fn().mockImplementation((run) => run(tx)) },
		tx,
	};
}

function createTx({
	events,
	athleteGroupIds = [],
	activities = [],
}: FakeSchedule) {
	return {
		event: {
			findMany: vi.fn(
				async ({
					where,
				}: {
					where: {
						workout: { activityType: string };
						startAt: { gt: Date; lte: Date };
					};
				}) =>
					events.filter(
						(event) =>
							event.activityType === where.workout.activityType &&
							event.startAt > where.startAt.gt &&
							event.startAt <= where.startAt.lte,
					),
			),
		},
		activity: {
			findMany: vi.fn(
				async ({
					where,
				}: {
					where: {
						workoutId: null;
						type: string;
						startDate: { gte: Date; lt: Date };
					};
				}) =>
					activities.filter(
						(activity) =>
							activity.workoutId === where.workoutId &&
							activity.type === where.type &&
							activity.startDate >= where.startDate.gte &&
							activity.startDate < where.startDate.lt,
					),
			),
			updateMany: vi.fn(
				async ({
					where,
				}: {
					where: { id: { in: string[] }; workoutId: null };
					data: { workoutId: string };
				}) => ({
					count: activities.filter(
						(activity) =>
							where.id.in.includes(activity.id) &&
							activity.workoutId === where.workoutId,
					).length,
				}),
			),
		},
		membership: {
			findMany: vi.fn(async () => [
				{ programId: "prog_1", program: { startDate: null, endDate: null } },
			]),
		},
		group_program: {
			findMany: vi.fn(async () =>
				athleteGroupIds.map((groupId) => ({ groupId, programId: "prog_1" })),
			),
		},
	};
}
