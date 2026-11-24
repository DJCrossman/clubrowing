import type { Context } from "@/domain/common/context";
import {
	mapToWorkoutDto,
	workoutInclude,
} from "@/domain/workouts/common/map-to-workout-dto";
import type { CreateWorkout } from "@/schemas";

export async function createWorkoutCommand(
	input: CreateWorkout,
	{ db }: Context,
) {
	const workout = await db.workout.create({
		data: {
			description: input.description,
			startDate: new Date(input.startDate),
			workoutType: input.workoutType,
			activityType: input.activityType,
			elapsedTime: input.elapsedTime,
			distance: input.distance,
			intervalCount: input.intervalCount ?? 1,
			intensityCategory: input.intensityCategory,
			fragments: input.fragments?.length
				? {
						create: input.fragments.map((fragment, position) => ({
							...fragment,
							position,
						})),
					}
				: undefined,
		},
		include: workoutInclude,
	});
	return mapToWorkoutDto(workout);
}
