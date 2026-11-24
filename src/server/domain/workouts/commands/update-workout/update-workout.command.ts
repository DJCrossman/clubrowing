import type { Context } from "@/domain/common/context";
import {
	mapToWorkoutDto,
	workoutInclude,
} from "@/domain/workouts/common/map-to-workout-dto";
import type { UpdateWorkout } from "@/schemas";

export async function updateWorkoutCommand(
	input: UpdateWorkout,
	{ db }: Context,
) {
	const workout = await db.workout.update({
		where: { id: input.id },
		data: {
			description: input.description,
			startDate: new Date(input.startDate),
			workoutType: input.workoutType,
			activityType: input.activityType,
			elapsedTime: input.elapsedTime,
			distance: input.distance,
			intervalCount: input.intervalCount ?? 1,
			intensityCategory: input.intensityCategory,
			fragments: {
				deleteMany: {},
				...(input.fragments?.length
					? {
							create: input.fragments.map(
								({ id: _id, workoutId: _wid, ...f }, position) => ({
									...f,
									position,
								}),
							),
						}
					: {}),
			},
		},
		include: workoutInclude,
	});
	return mapToWorkoutDto(workout);
}
