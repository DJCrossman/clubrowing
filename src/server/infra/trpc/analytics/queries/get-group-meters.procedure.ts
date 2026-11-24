import { getGroupByIdInputSchema } from "@/schemas";
import { getGroupMetersQuery } from "@/server/domain/analytics/queries/get-group-meters/get-group-meters.query";
import { canViewGroup } from "@/server/domain/groups/common";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getGroupMetersProcedure = viewerProcedure
	.input(getGroupByIdInputSchema)
	.permission(canViewGroup)
	.query(({ ctx, input }) => getGroupMetersQuery(input, ctx));
