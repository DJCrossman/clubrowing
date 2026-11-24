import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateEvent } from "@/schemas";

const after = vi.fn();

vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after,
}));

const { createEventsCommand } = await import("./create-events.command");

const MONDAY_6AM = "2030-01-07T06:00:00.000-06:00";
const PAST_6AM = "2026-11-02T06:00:00.000-06:00";

describe("createEventsCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("gives its workout to an empty session at the same time instead of creating an event", async () => {
		const { context, sessions, tx } = createContext([
			{ id: "evt_empty", workoutId: null },
		]);

		const result = await createEventsCommand({ events: [training()] }, context);

		expect(result).toMatchObject({ created: 0, filled: 1, failed: 0 });
		expect(result.firstStartAt).toBeDefined();
		expect(tx.event.create).not.toHaveBeenCalled();
		expect(sessions[0].workoutId).toBe("work_1");
		expect(tx.workout.create.mock.calls[0][0].data).toMatchObject({
			description: "4x2k",
			fragments: { create: [{ distance: 2000, position: 0 }] },
			zoneMinutes: { create: [{ intensityCategory: "C5", minutes: 40 }] },
		});
	});

	it("creates a new event when no session sits at that time", async () => {
		const { context, tx } = createContext([
			{
				id: "evt_later",
				workoutId: null,
				startAt: new Date("2030-01-07T23:00:00.000Z"),
			},
		]);

		const result = await createEventsCommand({ events: [training()] }, context);

		expect(result).toMatchObject({ created: 1, filled: 0, failed: 0 });
		expect(tx.event.create).toHaveBeenCalledOnce();
	});

	it("leaves a session that already has a workout alone and creates a new event", async () => {
		const { context, sessions, tx } = createContext([
			{ id: "evt_planned", workoutId: "work_planned" },
		]);

		const result = await createEventsCommand({ events: [training()] }, context);

		expect(result).toMatchObject({ created: 1, filled: 0 });
		expect(sessions[0].workoutId).toBe("work_planned");
		expect(tx.event.updateMany).not.toHaveBeenCalled();
		expect(tx.event.create).toHaveBeenCalledOnce();
	});

	it("never fills a session with an event that has no workout", async () => {
		const { context, sessions, tx } = createContext([
			{ id: "evt_empty", workoutId: null },
		]);

		const result = await createEventsCommand(
			{ events: [{ ...training(), workout: null }] },
			context,
		);

		expect(result).toMatchObject({ created: 1, filled: 0 });
		expect(sessions[0].workoutId).toBeNull();
		expect(tx.event.findFirst).not.toHaveBeenCalled();
	});

	it("fills an empty session once when two arrive for the same time", async () => {
		const { context, sessions, tx } = createContext([
			{ id: "evt_empty", workoutId: null },
		]);

		const result = await createEventsCommand(
			{ events: [training(), training()] },
			context,
		);

		expect(result).toMatchObject({ created: 1, filled: 1, failed: 0 });
		expect(sessions[0].workoutId).toBeTruthy();
		expect(tx.event.create).toHaveBeenCalledOnce();
		expect(tx.workout.delete).toHaveBeenCalledOnce();
	});

	it("links the activities logged during a past session it fills once it is saved", async () => {
		const { context, tx } = createContext([
			{ id: "evt_empty", workoutId: null, startAt: new Date(PAST_6AM) },
		]);
		tx.activity.findMany.mockResolvedValueOnce([
			{
				id: "act_1",
				athleteId: "ath_1",
				type: "erg",
				startDate: new Date("2026-11-02T12:15:00.000Z"),
			},
		]);
		tx.event.findMany.mockResolvedValueOnce([
			{
				workoutId: "work_1",
				startAt: new Date(PAST_6AM),
				audience: "club",
				groups: [],
			},
		]);

		const result = await createEventsCommand(
			{ events: [{ ...training(), startAt: PAST_6AM }] },
			context,
		);

		expect(result).toMatchObject({ filled: 1, failed: 0 });
		expect(after).toHaveBeenCalledOnce();
		expect(tx.activity.findMany).not.toHaveBeenCalled();
		await after.mock.calls[0][0]();
		expect(tx.activity.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["act_1"] }, workoutId: null },
			data: { workoutId: "work_1" },
		});
	});

	it("schedules linking for an event it creates with a workout, not one without", async () => {
		const { context } = createContext([]);

		await createEventsCommand(
			{ events: [training(), { ...training(), workout: null }] },
			context,
		);

		expect(after).toHaveBeenCalledOnce();
	});

	it("looks for no logged activities when it fills a future session", async () => {
		const { context, tx } = createContext([
			{ id: "evt_empty", workoutId: null },
		]);

		await createEventsCommand({ events: [training()] }, context);
		await after.mock.calls[0][0]();

		expect(tx.activity.findMany).not.toHaveBeenCalled();
	});
});

function training(): CreateEvent {
	return {
		type: "training",
		title: "Erg intervals",
		description: null,
		startAt: MONDAY_6AM,
		endAt: "2030-01-07T07:30:00.000-06:00",
		allDay: false,
		timezone: "America/Regina",
		location: null,
		audience: "club",
		groupIds: [],
		volunteerSpots: null,
		workout: {
			description: "4x2k",
			workoutType: "distance",
			activityType: "erg",
			distance: 8000,
			intervalCount: 4,
			intensityCategory: "C5",
			fragments: [{ distance: 2000, relativeTo: "2K", relativeSplitMs: 3000 }],
			zoneMinutes: { C5: 40 },
		},
	};
}

type Session = { id: string; workoutId: string | null; startAt?: Date };

function createContext(existing: Session[]) {
	const sessions = existing.map((session) => ({
		type: "training",
		startAt: new Date(MONDAY_6AM),
		createdAt: new Date("2029-12-01T00:00:00.000Z"),
		...session,
	}));
	let workouts = 0;

	const tx = {
		event: {
			findFirst: vi.fn(
				async ({
					where,
				}: {
					where: { type: string; workoutId: null; startAt: Date };
				}) =>
					sessions.find(
						(session) =>
							session.type === where.type &&
							session.workoutId === null &&
							session.startAt.getTime() === where.startAt.getTime(),
					) ?? null,
			),
			updateMany: vi.fn(
				async ({
					where,
					data,
				}: {
					where: { id: string; workoutId: null };
					data: { workoutId: string };
				}) => {
					const session = sessions.find(
						(candidate) =>
							candidate.id === where.id && candidate.workoutId === null,
					);
					if (!session) return { count: 0 };
					session.workoutId = data.workoutId;
					return { count: 1 };
				},
			),
			create: vi.fn(
				async ({
					data,
				}: {
					data: { startAt: Date; workoutId: string | null };
				}) => ({
					id: "evt_new",
					startAt: data.startAt,
					workout: data.workoutId
						? { id: data.workoutId, activityType: "erg" }
						: null,
				}),
			),
			findMany: vi.fn().mockResolvedValue([]),
		},
		activity: {
			findMany: vi.fn().mockResolvedValue([]),
			updateMany: vi.fn().mockResolvedValue({ count: 1 }),
		},
		workout: {
			create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({
				id: `work_${++workouts}`,
			})),
			delete: vi.fn(async () => ({})),
		},
	};

	const context = {
		athlete: { id: "ath_coach" },
		db: { $transaction: vi.fn().mockImplementation((run) => run(tx)) },
	};

	return { context, sessions, tx };
}
