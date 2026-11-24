import { getActivityByIdInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { getActivityByIdQuery } from "./get-activity-by-id.query";

export const getActivityByIdAdminProcedure = adminProcedure
	.input(getActivityByIdInputSchema)
	.query(({ ctx, input }) => getActivityByIdQuery(input, ctx));
