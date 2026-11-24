import { attachLoggedActivitiesToWorkout } from "@/domain/activities/common/scheduled-workout";
import type { AdminContext } from "@/domain/common/context";
import { createEventRow } from "@/domain/schedule/common/event-writes";
import { mapToEventDtos } from "@/domain/schedule/common/map-to-event-dto";
import type { CreateEvent } from "@/schemas";

export async function createEventCommand(
	input: CreateEvent,
	{ db, athlete, services }: AdminContext,
) {
	const row = await db.$transaction((tx) =>
		createEventRow(tx, input, athlete?.id ?? null),
	);
	const { workout } = row;
	if (workout) {
		services.taskManager.runAfterResponse(() =>
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
