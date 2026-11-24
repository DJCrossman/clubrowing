import { toggleReactionSchema } from "@/schemas/chat.schema";
import { toggleReactionCommand } from "@/server/domain/chat/commands/toggle-reaction/toggle-reaction.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const toggleReactionProcedure = viewerProcedure
	.input(toggleReactionSchema)
	.mutation(({ ctx, input }) => toggleReactionCommand(input, ctx));
