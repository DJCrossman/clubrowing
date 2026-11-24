import { sendMessageSchema } from "@/schemas/chat.schema";
import { sendMessageCommand } from "@/server/domain/chat/commands/send-message/send-message.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const sendMessageProcedure = viewerProcedure
	.input(sendMessageSchema)
	.mutation(({ ctx, input }) => sendMessageCommand(input, ctx));
