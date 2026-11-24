import { submitCommand } from "@/domain/feedback/commands/submit/submit.command";
import { submitFeedbackSchema } from "@/schemas";
import { publicProcedure } from "@/trpc/procedures/public.procedure";

export const submitProcedure = publicProcedure
	.input(submitFeedbackSchema)
	.mutation(({ ctx, input }) => submitCommand(input, ctx));
