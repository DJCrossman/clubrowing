import { getMessagesInputSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getMessagesQuery } from "./get-messages.query";

export const getMessagesProcedure = viewerProcedure
	.input(getMessagesInputSchema)
	.query(({ ctx, input }) => getMessagesQuery(input, ctx));
