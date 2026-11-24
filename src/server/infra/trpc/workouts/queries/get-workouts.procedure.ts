import { getWorkoutsQuery } from "@/server/domain/workouts/queries/get-workouts/get-workouts.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getWorkoutsProcedure = viewerProcedure.query(({ ctx }) =>
	getWorkoutsQuery(undefined, ctx),
);
