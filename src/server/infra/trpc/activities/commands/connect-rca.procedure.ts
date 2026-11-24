import { connectRcaInputSchema } from "@/schemas";
import { connectRcaCommand } from "@/server/domain/activities/commands/connect-rca/connect-rca.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const connectRcaProcedure = protectedProcedure
	.input(connectRcaInputSchema)
	.mutation(({ ctx, input }) => connectRcaCommand(input, ctx));
