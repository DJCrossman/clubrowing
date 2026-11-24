import { getMessagesInputSchema } from "@/schemas/chat.schema";
import { getMessagesQuery } from "@/server/domain/chat/queries/get-messages/get-messages.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getMessagesProcedure = viewerProcedure
	.input(getMessagesInputSchema)
	.query(({ ctx, input }) => getMessagesQuery(input, ctx));
