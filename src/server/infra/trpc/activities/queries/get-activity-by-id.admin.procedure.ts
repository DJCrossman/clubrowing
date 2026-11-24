import { getActivityByIdInputSchema } from "@/schemas";
import { getActivityByIdQuery } from "@/server/domain/activities/queries/get-activity-by-id/get-activity-by-id.query";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const getActivityByIdAdminProcedure = adminProcedure
	.input(getActivityByIdInputSchema)
	.query(({ ctx, input }) => getActivityByIdQuery(input, ctx));
