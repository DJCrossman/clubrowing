import { getWorkoutByIdQuery } from "@/domain/workouts/queries/get-workout-by-id/get-workout-by-id.query";
import { getWorkoutByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getWorkoutByIdProcedure = viewerProcedure
	.input(getWorkoutByIdInputSchema)
	.query(({ ctx, input }) => getWorkoutByIdQuery(input, ctx));
