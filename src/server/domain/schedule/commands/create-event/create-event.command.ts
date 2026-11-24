import { after } from "next/server";
import type { CreateEvent } from "@/schemas";
import { attachLoggedActivitiesToWorkout } from "@/server/domain/activities/common/scheduled-workout";
import type { AdminContext } from "@/server/domain/common/context";
import { createEventRow } from "@/server/domain/schedule/common/event-writes";
import { mapToEventDtos } from "@/server/domain/schedule/common/map-to-event-dto";

export async function createEventCommand(
	input: CreateEvent,
	{ db, athlete }: AdminContext,
) {
	const row = await db.$transaction((tx) =>
		createEventRow(tx, input, athlete?.id ?? null),
	);
	const { workout } = row;
	if (workout) {
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
	return event;
}
