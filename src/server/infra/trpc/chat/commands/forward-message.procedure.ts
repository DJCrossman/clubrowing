import { forwardMessageCommand } from "@/domain/chat/commands/forward-message/forward-message.command";
import { forwardMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const forwardMessageProcedure = viewerProcedure
	.input(forwardMessageSchema)
	.mutation(({ ctx, input }) => forwardMessageCommand(input, ctx));
