import { after } from "next/server";
import { attachLoggedActivitiesToWorkout } from "@/domain/activities/common/scheduled-workout";
import type { AdminContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import { updateEventRow } from "@/domain/schedule/common/event-writes";
import { mapToEventDtos } from "@/domain/schedule/common/map-to-event-dto";
import {
	notifiableEventSelect,
	planChangeNotifications,
	sendAfterResponse,
	toEventSnapshot,
} from "@/domain/schedule/common/schedule-change-notifications";
import type { UpdateEventInput } from "@/schemas";

export async function updateEventCommand(
	{ id, notify, ...input }: UpdateEventInput,
	{ db, athlete, services }: AdminContext,
) {
	const existing = await db.event.findUnique({
		where: { id },
		select: {
			...notifiableEventSelect,
			workoutId: true,
			_count: { select: { rsvps: { where: { status: "yes" } } } },
		},
	});
	if (!existing) {
		throw new DomainError("NOT_FOUND", "Event not found");
	}
	if (input.type !== existing.type) {
		throw new DomainError("BAD_REQUEST", "An event's type can't be changed");
	}
	const signedUp = existing._count.rsvps;
	if (input.type === "volunteer" && (input.volunteerSpots ?? 0) < signedUp) {
		throw new DomainError(
			"BAD_REQUEST",
			`${signedUp} people already signed up for this shift`,
		);
	}

	const row = await db.$transaction((tx) =>
		updateEventRow(tx, id, input, existing.workoutId),
	);
	const { workout } = row;
	if (!existing.workoutId && workout) {
		after(() =>
			attachLoggedActivitiesToWorkout({
				db,
				event: {
					workoutId: workout.id,
					startAt: row.startAt,
					activityType: workout.activityType,
				},
			}),
		);
	}
	const [event] = await mapToEventDtos(db, [row], athlete?.id ?? null);
	sendAfterResponse(
		services.push,
		notify
			? planChangeNotifications(
					[existing],
					new Map([[id, toEventSnapshot(id, input)]]),
				)
			: [],
	);
	return event;
}
