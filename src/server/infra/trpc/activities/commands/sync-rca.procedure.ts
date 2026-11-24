import { syncRcaCommand } from "@/server/domain/activities/commands/sync-rca/sync-rca.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const syncRcaProcedure = protectedProcedure.mutation(({ ctx }) =>
	syncRcaCommand(undefined, ctx),
);
