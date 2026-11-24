import { toggleReactionCommand } from "@/domain/chat/commands/toggle-reaction/toggle-reaction.command";
import { toggleReactionSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const toggleReactionProcedure = viewerProcedure
	.input(toggleReactionSchema)
	.mutation(({ ctx, input }) => toggleReactionCommand(input, ctx));
