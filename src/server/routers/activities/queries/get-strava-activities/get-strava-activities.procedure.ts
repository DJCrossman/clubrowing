import { getStravaActivitiesInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { getStravaActivitiesQuery } from "./get-strava-activities.query";

export const getStravaActivitiesProcedure = protectedProcedure
	.input(getStravaActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getStravaActivitiesQuery(input, ctx));
