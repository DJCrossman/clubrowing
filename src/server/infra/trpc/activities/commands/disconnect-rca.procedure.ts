import { disconnectRcaCommand } from "@/domain/activities/commands/disconnect-rca/disconnect-rca.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const disconnectRcaProcedure = protectedProcedure.mutation(({ ctx }) =>
	disconnectRcaCommand(undefined, ctx),
);
