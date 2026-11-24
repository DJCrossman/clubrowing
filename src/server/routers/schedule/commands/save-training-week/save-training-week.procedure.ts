import { saveTrainingWeekSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { saveTrainingWeekCommand } from "./save-training-week.command";

export const saveTrainingWeekProcedure = adminProcedure
	.input(saveTrainingWeekSchema)
	.mutation(({ ctx, input }) => saveTrainingWeekCommand(input, ctx));
