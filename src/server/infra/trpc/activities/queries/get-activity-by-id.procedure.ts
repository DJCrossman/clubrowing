import { getActivityByIdMemberQuery } from "@/domain/activities/queries/get-activity-by-id/get-activity-by-id.member.query";
import { getActivityByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getActivityByIdProcedure = viewerProcedure
	.input(getActivityByIdInputSchema)
	.query(({ ctx, input }) => getActivityByIdMemberQuery(input, ctx));
