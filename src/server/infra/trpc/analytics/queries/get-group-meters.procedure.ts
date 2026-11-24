import { getGroupMetersQuery } from "@/domain/analytics/queries/get-group-meters/get-group-meters.query";
import { canViewGroup } from "@/domain/groups/common";
import { getGroupByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getGroupMetersProcedure = viewerProcedure
	.input(getGroupByIdInputSchema)
	.permission(canViewGroup)
	.query(({ ctx, input }) => getGroupMetersQuery(input, ctx));
