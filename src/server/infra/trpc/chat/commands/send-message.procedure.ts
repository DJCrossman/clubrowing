import { sendMessageCommand } from "@/domain/chat/commands/send-message/send-message.command";
import { sendMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const sendMessageProcedure = viewerProcedure
	.input(sendMessageSchema)
	.mutation(({ ctx, input }) => sendMessageCommand(input, ctx));
