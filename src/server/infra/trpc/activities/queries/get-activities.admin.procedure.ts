import {
	getActivitiesInputSchema,
	getActivitiesQuery,
} from "@/server/domain/activities/queries/get-activities/get-activities.query";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const getActivitiesAdminProcedure = adminProcedure
	.input(getActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getActivitiesQuery(input, ctx));
