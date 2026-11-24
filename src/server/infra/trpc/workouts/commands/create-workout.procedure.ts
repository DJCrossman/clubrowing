import { createWorkoutCommand } from "@/domain/workouts/commands/create-workout/create-workout.command";
import { workoutCoreSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createWorkoutProcedure = adminProcedure
	.input(workoutCoreSchema)
	.mutation(({ ctx, input }) => createWorkoutCommand(input, ctx));
