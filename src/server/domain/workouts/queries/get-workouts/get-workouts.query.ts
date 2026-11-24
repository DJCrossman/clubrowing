import type { Context } from "@/domain/common/context";
import {
	mapToWorkoutDto,
	workoutInclude,
} from "@/domain/workouts/common/map-to-workout-dto";
import { paginate } from "@/lib/pagination";

export async function getWorkoutsQuery(_input: undefined, { db }: Context) {
	const [workouts, totalCount] = await Promise.all([
		db.workout.findMany({
			orderBy: { startDate: "desc" },
			include: workoutInclude,
		}),
		db.workout.count(),
	]);

	return paginate({
		data: workouts.map(mapToWorkoutDto),
		totalCount,
	});
}
