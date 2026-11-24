import { getActivitiesMemberQuery } from "@/domain/activities/queries/get-activities/get-activities.member.query";
import { getActivitiesInputSchema } from "@/domain/activities/queries/get-activities/get-activities.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getActivitiesProcedure = viewerProcedure
	.input(getActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getActivitiesMemberQuery(input, ctx));
