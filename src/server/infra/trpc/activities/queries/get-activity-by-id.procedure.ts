import { getActivityByIdInputSchema } from "@/schemas";
import { getActivityByIdMemberQuery } from "@/server/domain/activities/queries/get-activity-by-id/get-activity-by-id.member.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getActivityByIdProcedure = viewerProcedure
	.input(getActivityByIdInputSchema)
	.query(({ ctx, input }) => getActivityByIdMemberQuery(input, ctx));
