import { getMessagesQuery } from "@/domain/chat/queries/get-messages/get-messages.query";
import { getMessagesInputSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getMessagesProcedure = viewerProcedure
	.input(getMessagesInputSchema)
	.query(({ ctx, input }) => getMessagesQuery(input, ctx));
