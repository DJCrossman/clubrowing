import { getWorkoutsQuery } from "@/domain/workouts/queries/get-workouts/get-workouts.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getWorkoutsProcedure = viewerProcedure.query(({ ctx }) =>
	getWorkoutsQuery(undefined, ctx),
);
