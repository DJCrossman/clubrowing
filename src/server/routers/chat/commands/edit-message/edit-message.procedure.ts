import { editMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { editMessageCommand } from "./edit-message.command";

export const editMessageProcedure = viewerProcedure
	.input(editMessageSchema)
	.mutation(({ ctx, input }) => editMessageCommand(input, ctx));
