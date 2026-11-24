import { getThreadQuery } from "@/domain/chat/queries/get-thread/get-thread.query";
import { getThreadInputSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getThreadProcedure = viewerProcedure
	.input(getThreadInputSchema)
	.query(({ ctx, input }) => getThreadQuery(input, ctx));
