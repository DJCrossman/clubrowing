import { updateWorkoutCommand } from "@/domain/workouts/commands/update-workout/update-workout.command";
import { updateWorkoutSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateWorkoutProcedure = adminProcedure
	.input(updateWorkoutSchema)
	.mutation(({ ctx, input }) => updateWorkoutCommand(input, ctx));
