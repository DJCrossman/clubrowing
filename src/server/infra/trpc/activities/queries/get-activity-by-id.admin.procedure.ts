import { getActivityByIdQuery } from "@/domain/activities/queries/get-activity-by-id/get-activity-by-id.query";
import { getActivityByIdInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const getActivityByIdAdminProcedure = adminProcedure
	.input(getActivityByIdInputSchema)
	.query(({ ctx, input }) => getActivityByIdQuery(input, ctx));
