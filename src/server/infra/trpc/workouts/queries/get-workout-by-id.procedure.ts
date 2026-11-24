import { getWorkoutByIdInputSchema } from "@/schemas";
import { getWorkoutByIdQuery } from "@/server/domain/workouts/queries/get-workout-by-id/get-workout-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getWorkoutByIdProcedure = viewerProcedure
	.input(getWorkoutByIdInputSchema)
	.query(({ ctx, input }) => getWorkoutByIdQuery(input, ctx));
