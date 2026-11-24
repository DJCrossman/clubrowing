import type { Context } from "@/domain/common/context";
import {
	mapToWorkoutDto,
	workoutInclude,
} from "@/domain/workouts/common/map-to-workout-dto";
import type { GetWorkoutByIdInput } from "@/schemas";

export async function getWorkoutByIdQuery(
	input: GetWorkoutByIdInput,
	{ db }: Context,
) {
	const workout = await db.workout.findUnique({
		where: { id: input.id },
		include: workoutInclude,
	});
	return workout ? mapToWorkoutDto(workout) : null;
}
