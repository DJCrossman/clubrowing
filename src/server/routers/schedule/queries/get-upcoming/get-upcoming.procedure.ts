import { getUpcomingInputSchema } from "@/schemas";
import { canViewGroupScope } from "@/server/domain/groups/common";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getUpcomingQuery } from "./get-upcoming.query";

export const getUpcomingProcedure = viewerProcedure
	.input(getUpcomingInputSchema)
	.permission(canViewGroupScope)
	.query(({ ctx, input }) => getUpcomingQuery(input, ctx));
