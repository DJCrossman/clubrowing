import { editMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/procedures";
import { editMessageCommand } from "./edit-message.command";

export const editMessageProcedure = viewerProcedure
	.input(editMessageSchema)
	.mutation(({ ctx, input }) => editMessageCommand(input, ctx));
