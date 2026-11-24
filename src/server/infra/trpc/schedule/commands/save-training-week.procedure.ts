import { saveTrainingWeekSchema } from "@/schemas";
import { saveTrainingWeekCommand } from "@/server/domain/schedule/commands/save-training-week/save-training-week.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const saveTrainingWeekProcedure = adminProcedure
	.input(saveTrainingWeekSchema)
	.mutation(({ ctx, input }) => saveTrainingWeekCommand(input, ctx));
