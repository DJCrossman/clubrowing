import { getEventByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getEventByIdQuery } from "./get-event-by-id.query";

export const getEventByIdProcedure = viewerProcedure
	.input(getEventByIdInputSchema)
	.query(({ ctx, input }) => getEventByIdQuery(input, ctx));
