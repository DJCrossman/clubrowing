import { eventIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getResponsesQuery } from "./get-responses.query";

export const getResponsesProcedure = viewerProcedure
	.input(eventIdInputSchema)
	.query(({ ctx, input }) => getResponsesQuery(input, ctx));
