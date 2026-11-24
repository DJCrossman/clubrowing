import { getBoatByIdQuery } from "@/domain/boats/queries/get-boat-by-id/get-boat-by-id.query";
import { getBoatByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getBoatByIdProcedure = viewerProcedure
	.input(getBoatByIdInputSchema)
	.query(({ ctx, input }) => getBoatByIdQuery(input, ctx));
