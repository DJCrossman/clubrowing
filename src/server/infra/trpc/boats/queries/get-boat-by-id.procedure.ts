import { getBoatByIdInputSchema } from "@/schemas";
import { getBoatByIdQuery } from "@/server/domain/boats/queries/get-boat-by-id/get-boat-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getBoatByIdProcedure = viewerProcedure
	.input(getBoatByIdInputSchema)
	.query(({ ctx, input }) => getBoatByIdQuery(input, ctx));
