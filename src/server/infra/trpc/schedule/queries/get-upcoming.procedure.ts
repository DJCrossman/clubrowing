import { getUpcomingInputSchema } from "@/schemas";
import { canViewGroupScope } from "@/server/domain/groups/common";
import { getUpcomingQuery } from "@/server/domain/schedule/queries/get-upcoming/get-upcoming.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getUpcomingProcedure = viewerProcedure
	.input(getUpcomingInputSchema)
	.permission(canViewGroupScope)
	.query(({ ctx, input }) => getUpcomingQuery(input, ctx));
