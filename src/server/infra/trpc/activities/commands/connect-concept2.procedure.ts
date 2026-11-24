import { connectConcept2InputSchema } from "@/schemas";
import { connectConcept2Command } from "@/server/domain/activities/commands/connect-concept2/connect-concept2.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const connectConcept2Procedure = protectedProcedure
	.input(connectConcept2InputSchema)
	.mutation(({ ctx, input }) => connectConcept2Command(input, ctx));
