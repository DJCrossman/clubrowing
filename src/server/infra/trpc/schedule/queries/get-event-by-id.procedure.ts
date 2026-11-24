import { getEventByIdQuery } from "@/domain/schedule/queries/get-event-by-id/get-event-by-id.query";
import { getEventByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getEventByIdProcedure = viewerProcedure
	.input(getEventByIdInputSchema)
	.query(({ ctx, input }) => getEventByIdQuery(input, ctx));
