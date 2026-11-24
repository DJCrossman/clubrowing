import { saveTrainingWeekCommand } from "@/domain/schedule/commands/save-training-week/save-training-week.command";
import { saveTrainingWeekSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const saveTrainingWeekProcedure = adminProcedure
	.input(saveTrainingWeekSchema)
	.mutation(({ ctx, input }) => saveTrainingWeekCommand(input, ctx));
