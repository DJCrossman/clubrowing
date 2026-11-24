import { sendMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { sendMessageCommand } from "./send-message.command";

export const sendMessageProcedure = viewerProcedure
	.input(sendMessageSchema)
	.mutation(({ ctx, input }) => sendMessageCommand(input, ctx));
