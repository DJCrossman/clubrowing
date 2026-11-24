import { getEventByIdInputSchema } from "@/schemas";
import { getEventByIdQuery } from "@/server/domain/schedule/queries/get-event-by-id/get-event-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getEventByIdProcedure = viewerProcedure
	.input(getEventByIdInputSchema)
	.query(({ ctx, input }) => getEventByIdQuery(input, ctx));
