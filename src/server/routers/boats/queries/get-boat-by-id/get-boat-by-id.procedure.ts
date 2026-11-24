import { getBoatByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getBoatByIdQuery } from "./get-boat-by-id.query";

export const getBoatByIdProcedure = viewerProcedure
	.input(getBoatByIdInputSchema)
	.query(({ ctx, input }) => getBoatByIdQuery(input, ctx));
