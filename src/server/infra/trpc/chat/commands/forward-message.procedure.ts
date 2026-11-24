import { forwardMessageSchema } from "@/schemas/chat.schema";
import { forwardMessageCommand } from "@/server/domain/chat/commands/forward-message/forward-message.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const forwardMessageProcedure = viewerProcedure
	.input(forwardMessageSchema)
	.mutation(({ ctx, input }) => forwardMessageCommand(input, ctx));
