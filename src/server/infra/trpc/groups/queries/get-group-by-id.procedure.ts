import { getGroupByIdInputSchema } from "@/schemas";
import { getGroupByIdQuery } from "@/server/domain/groups/queries/get-group-by-id/get-group-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getGroupByIdProcedure = viewerProcedure
	.input(getGroupByIdInputSchema)
	.query(({ ctx, input }) => getGroupByIdQuery(input, ctx));
