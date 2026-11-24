import { getGroupByIdQuery } from "@/domain/groups/queries/get-group-by-id/get-group-by-id.query";
import { getGroupByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getGroupByIdProcedure = viewerProcedure
	.input(getGroupByIdInputSchema)
	.query(({ ctx, input }) => getGroupByIdQuery(input, ctx));
