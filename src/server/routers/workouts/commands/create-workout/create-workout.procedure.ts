import { workoutCoreSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createWorkoutCommand } from "./create-workout.command";

export const createWorkoutProcedure = adminProcedure
	.input(workoutCoreSchema)
	.mutation(({ ctx, input }) => createWorkoutCommand(input, ctx));
