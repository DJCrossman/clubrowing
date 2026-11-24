import { getActivityByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getActivityByIdMemberQuery } from "./get-activity-by-id.member.query";

export const getActivityByIdProcedure = viewerProcedure
	.input(getActivityByIdInputSchema)
	.query(({ ctx, input }) => getActivityByIdMemberQuery(input, ctx));
