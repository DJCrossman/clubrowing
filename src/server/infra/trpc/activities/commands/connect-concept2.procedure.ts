import { connectConcept2Command } from "@/domain/activities/commands/connect-concept2/connect-concept2.command";
import { connectConcept2InputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const connectConcept2Procedure = protectedProcedure
	.input(connectConcept2InputSchema)
	.mutation(({ ctx, input }) => connectConcept2Command(input, ctx));
