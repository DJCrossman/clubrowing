import { deleteMessageSchema } from "@/schemas/chat.schema";
import { deleteMessageCommand } from "@/server/domain/chat/commands/delete-message/delete-message.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const deleteMessageProcedure = viewerProcedure
	.input(deleteMessageSchema)
	.mutation(({ ctx, input }) => deleteMessageCommand(input, ctx));
