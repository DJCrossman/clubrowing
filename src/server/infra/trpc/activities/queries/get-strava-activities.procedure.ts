import { getStravaActivitiesInputSchema } from "@/schemas";
import { getStravaActivitiesQuery } from "@/server/domain/activities/queries/get-strava-activities/get-strava-activities.query";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const getStravaActivitiesProcedure = protectedProcedure
	.input(getStravaActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getStravaActivitiesQuery(input, ctx));
