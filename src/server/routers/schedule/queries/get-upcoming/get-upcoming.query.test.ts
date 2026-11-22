import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/server/context";
import type { EventRow } from "@/server/routers/schedule/common/map-to-event-dto";
import { getUpcomingQuery } from "./get-upcoming.query";

// Wednesday noon in Regina; the club week runs Sunday Nov 22 to Saturday Nov 28.
const NOW = new Date("2026-11-25T18:00:00.000Z");

const baseEvent: EventRow = {
	id: "evt_1",
	type: "training",
	title: "Morning row",
	description: null,
	startAt: new Date("2026-11-26T12:30:00Z"),
	endAt: null,
	allDay: false,
	timezone: "America/Regina",
	location: "Wascana boathouse",
	workoutId: null,
	audience: "club",
	volunteerSpots: null,
	createdById: null,
	createdAt: new Date("2026-11-01T00:00:00Z"),
	updatedAt: new Date("2026-11-01T00:00:00Z"),
	workout: null,
	groups: [],
	rsvps: [],
};

describe("getUpcomingQuery", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("asks for a reply to a training this week, up to Saturday night", async () => {
		// 8pm Saturday in Regina is already Sunday in UTC.
		const { pendingRsvps } = await getUpcomingQuery(
			{ limit: 5 },
			createContext([
				{ ...baseEvent, startAt: new Date("2026-11-29T02:00:00Z") },
			]),
		);

		expect(pendingRsvps.map((event) => event.id)).toEqual(["evt_1"]);
	});

	it("does not ask for a reply to a training next week, which is still up next", async () => {
		const { pendingRsvps, next } = await getUpcomingQuery(
			{ limit: 5 },
			createContext([
				{ ...baseEvent, startAt: new Date("2026-11-29T13:00:00Z") },
			]),
		);

		expect(pendingRsvps).toEqual([]);
		expect(next.map((event) => event.id)).toEqual(["evt_1"]);
	});

	it("asks for a reply to a social and a regatta next week", async () => {
		const { pendingRsvps } = await getUpcomingQuery(
			{ limit: 5 },
			createContext([
				{
					...baseEvent,
					id: "evt_social",
					type: "social",
					startAt: new Date("2026-12-05T01:00:00Z"),
				},
				{
					...baseEvent,
					id: "evt_regatta",
					type: "regatta",
					startAt: new Date("2026-12-05T14:00:00Z"),
				},
			]),
		);

		expect(pendingRsvps.map((event) => event.id)).toEqual([
			"evt_social",
			"evt_regatta",
		]);
	});

	it("does not ask again once the viewer has replied", async () => {
		const { pendingRsvps } = await getUpcomingQuery(
			{ limit: 5 },
			createContext([
				{ ...baseEvent, rsvps: [{ athleteId: "ath_me", status: "no" }] },
			]),
		);

		expect(pendingRsvps).toEqual([]);
	});

	it("leaves volunteer shifts out of the replies", async () => {
		const { pendingRsvps } = await getUpcomingQuery(
			{ limit: 5 },
			createContext([{ ...baseEvent, type: "volunteer", volunteerSpots: 4 }]),
		);

		expect(pendingRsvps).toEqual([]);
	});
});

function createContext(events: EventRow[]) {
	const db = {
		event: { findMany: vi.fn(async () => events) },
		membership: { findMany: vi.fn(async () => []) },
		athlete: { findMany: vi.fn(async () => [{ id: "ath_me" }]) },
	};
	return {
		db,
		user: { id: "user_me", isAdmin: false },
		athlete: { id: "ath_me", role: "member" },
	} as unknown as ViewerContext;
}
