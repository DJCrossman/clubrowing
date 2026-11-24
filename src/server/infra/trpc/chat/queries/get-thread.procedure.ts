import { getThreadInputSchema } from "@/schemas/chat.schema";
import { getThreadQuery } from "@/server/domain/chat/queries/get-thread/get-thread.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getThreadProcedure = viewerProcedure
	.input(getThreadInputSchema)
	.query(({ ctx, input }) => getThreadQuery(input, ctx));
