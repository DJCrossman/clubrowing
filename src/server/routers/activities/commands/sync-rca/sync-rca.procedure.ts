import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { syncRcaCommand } from "./sync-rca.command";

export const syncRcaProcedure = protectedProcedure.mutation(({ ctx }) =>
	syncRcaCommand(undefined, ctx),
);
