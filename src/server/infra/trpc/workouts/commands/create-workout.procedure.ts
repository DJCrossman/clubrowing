import { workoutCoreSchema } from "@/schemas";
import { createWorkoutCommand } from "@/server/domain/workouts/commands/create-workout/create-workout.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createWorkoutProcedure = adminProcedure
	.input(workoutCoreSchema)
	.mutation(({ ctx, input }) => createWorkoutCommand(input, ctx));
