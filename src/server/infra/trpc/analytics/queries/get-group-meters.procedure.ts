import { getGroupByIdInputSchema } from "@/schemas";
import { getGroupMetersQuery } from "@/server/domain/analytics/queries/get-group-meters/get-group-meters.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { canViewGroup } from "@/server/routers/groups/common";

export const getGroupMetersProcedure = viewerProcedure
	.input(getGroupByIdInputSchema)
	.permission(canViewGroup)
	.query(({ ctx, input }) => getGroupMetersQuery(input, ctx));
