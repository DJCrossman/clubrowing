import { canViewGroupScope } from "@/domain/groups/common";
import { getUpcomingQuery } from "@/domain/schedule/queries/get-upcoming/get-upcoming.query";
import { getUpcomingInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getUpcomingProcedure = viewerProcedure
	.input(getUpcomingInputSchema)
	.permission(canViewGroupScope)
	.query(({ ctx, input }) => getUpcomingQuery(input, ctx));
