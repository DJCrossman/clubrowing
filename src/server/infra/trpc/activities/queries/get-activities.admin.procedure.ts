import {
	getActivitiesInputSchema,
	getActivitiesQuery,
} from "@/domain/activities/queries/get-activities/get-activities.query";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const getActivitiesAdminProcedure = adminProcedure
	.input(getActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getActivitiesQuery(input, ctx));
