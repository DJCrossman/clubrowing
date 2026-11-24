import { deleteMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { deleteMessageCommand } from "./delete-message.command";

export const deleteMessageProcedure = viewerProcedure
	.input(deleteMessageSchema)
	.mutation(({ ctx, input }) => deleteMessageCommand(input, ctx));
