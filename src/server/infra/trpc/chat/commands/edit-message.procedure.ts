import { editMessageSchema } from "@/schemas/chat.schema";
import { editMessageCommand } from "@/server/domain/chat/commands/edit-message/edit-message.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const editMessageProcedure = viewerProcedure
	.input(editMessageSchema)
	.mutation(({ ctx, input }) => editMessageCommand(input, ctx));
