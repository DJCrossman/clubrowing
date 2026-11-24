import { submitFeedbackSchema } from "@/schemas";
import { submitCommand } from "@/server/domain/feedback/commands/submit/submit.command";
import { publicProcedure } from "@/server/infra/trpc/procedures/public.procedure";

export const submitProcedure = publicProcedure
	.input(submitFeedbackSchema)
	.mutation(({ ctx, input }) => submitCommand(input, ctx));
