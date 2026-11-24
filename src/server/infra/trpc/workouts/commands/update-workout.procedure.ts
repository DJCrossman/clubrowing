import { updateWorkoutSchema } from "@/schemas";
import { updateWorkoutCommand } from "@/server/domain/workouts/commands/update-workout/update-workout.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateWorkoutProcedure = adminProcedure
	.input(updateWorkoutSchema)
	.mutation(({ ctx, input }) => updateWorkoutCommand(input, ctx));
