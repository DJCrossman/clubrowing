import { getStravaAthleteInputSchema } from "@/schemas";
import { getStravaAthleteQuery } from "@/server/domain/activities/queries/get-strava-athlete/get-strava-athlete.query";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const getStravaAthleteProcedure = protectedProcedure
	.input(getStravaAthleteInputSchema.optional())
	.query(({ ctx, input = {} }) => getStravaAthleteQuery(input, ctx));
