import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getWorkoutsQuery } from "./get-workouts.query";

export const getWorkoutsProcedure = viewerProcedure.query(({ ctx }) =>
	getWorkoutsQuery(undefined, ctx),
);
