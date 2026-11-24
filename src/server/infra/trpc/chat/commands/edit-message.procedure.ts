import { editMessageCommand } from "@/domain/chat/commands/edit-message/edit-message.command";
import { editMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const editMessageProcedure = viewerProcedure
	.input(editMessageSchema)
	.mutation(({ ctx, input }) => editMessageCommand(input, ctx));
