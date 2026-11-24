import { connectRcaCommand } from "@/domain/activities/commands/connect-rca/connect-rca.command";
import { connectRcaInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const connectRcaProcedure = protectedProcedure
	.input(connectRcaInputSchema)
	.mutation(({ ctx, input }) => connectRcaCommand(input, ctx));
