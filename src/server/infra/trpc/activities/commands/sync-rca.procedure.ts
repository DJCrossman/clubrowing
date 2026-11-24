import { syncRcaCommand } from "@/domain/activities/commands/sync-rca/sync-rca.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const syncRcaProcedure = protectedProcedure.mutation(({ ctx }) =>
	syncRcaCommand(undefined, ctx),
);
