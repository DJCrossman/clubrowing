import { toggleReactionSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { toggleReactionCommand } from "./toggle-reaction.command";

export const toggleReactionProcedure = viewerProcedure
	.input(toggleReactionSchema)
	.mutation(({ ctx, input }) => toggleReactionCommand(input, ctx));
