import { getStravaActivitiesQuery } from "@/domain/activities/queries/get-strava-activities/get-strava-activities.query";
import { getStravaActivitiesInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const getStravaActivitiesProcedure = protectedProcedure
	.input(getStravaActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getStravaActivitiesQuery(input, ctx));
