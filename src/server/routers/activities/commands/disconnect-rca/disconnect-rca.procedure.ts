import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { disconnectRcaCommand } from "./disconnect-rca.command";

export const disconnectRcaProcedure = protectedProcedure.mutation(({ ctx }) =>
	disconnectRcaCommand(undefined, ctx),
);
