import { getStravaAthleteQuery } from "@/domain/activities/queries/get-strava-athlete/get-strava-athlete.query";
import { getStravaAthleteInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const getStravaAthleteProcedure = protectedProcedure
	.input(getStravaAthleteInputSchema.optional())
	.query(({ ctx, input = {} }) => getStravaAthleteQuery(input, ctx));
