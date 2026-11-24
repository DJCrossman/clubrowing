import { getGroupByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getGroupByIdQuery } from "./get-group-by-id.query";

export const getGroupByIdProcedure = viewerProcedure
	.input(getGroupByIdInputSchema)
	.query(({ ctx, input }) => getGroupByIdQuery(input, ctx));
