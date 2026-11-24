import { startDmSchema } from "@/schemas/chat.schema";
import { startDmCommand } from "@/server/domain/chat/commands/start-dm/start-dm.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const startDmProcedure = viewerProcedure
	.input(startDmSchema)
	.mutation(({ ctx, input }) => startDmCommand(input, ctx));
