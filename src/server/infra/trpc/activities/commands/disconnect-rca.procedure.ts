import { disconnectRcaCommand } from "@/server/domain/activities/commands/disconnect-rca/disconnect-rca.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const disconnectRcaProcedure = protectedProcedure.mutation(({ ctx }) =>
	disconnectRcaCommand(undefined, ctx),
);
