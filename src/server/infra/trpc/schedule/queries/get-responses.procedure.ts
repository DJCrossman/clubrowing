import { getResponsesQuery } from "@/domain/schedule/queries/get-responses/get-responses.query";
import { eventIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getResponsesProcedure = viewerProcedure
	.input(eventIdInputSchema)
	.query(({ ctx, input }) => getResponsesQuery(input, ctx));
