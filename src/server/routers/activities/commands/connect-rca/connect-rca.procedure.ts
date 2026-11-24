import { connectRcaInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { connectRcaCommand } from "./connect-rca.command";

export const connectRcaProcedure = protectedProcedure
	.input(connectRcaInputSchema)
	.mutation(({ ctx, input }) => connectRcaCommand(input, ctx));
