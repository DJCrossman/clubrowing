import { eventIdInputSchema } from "@/schemas";
import { getResponsesQuery } from "@/server/domain/schedule/queries/get-responses/get-responses.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getResponsesProcedure = viewerProcedure
	.input(eventIdInputSchema)
	.query(({ ctx, input }) => getResponsesQuery(input, ctx));
