import { startDmCommand } from "@/domain/chat/commands/start-dm/start-dm.command";
import { startDmSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const startDmProcedure = viewerProcedure
	.input(startDmSchema)
	.mutation(({ ctx, input }) => startDmCommand(input, ctx));
