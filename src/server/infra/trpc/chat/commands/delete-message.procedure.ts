import { deleteMessageCommand } from "@/domain/chat/commands/delete-message/delete-message.command";
import { deleteMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const deleteMessageProcedure = viewerProcedure
	.input(deleteMessageSchema)
	.mutation(({ ctx, input }) => deleteMessageCommand(input, ctx));
