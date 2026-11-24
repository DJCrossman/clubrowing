import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import {
	getActivitiesInputSchema,
	getActivitiesQuery,
} from "./get-activities.query";

export const getActivitiesAdminProcedure = adminProcedure
	.input(getActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getActivitiesQuery(input, ctx));
