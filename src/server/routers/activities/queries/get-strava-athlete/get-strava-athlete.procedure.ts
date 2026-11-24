import { getStravaAthleteInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { getStravaAthleteQuery } from "./get-strava-athlete.query";

export const getStravaAthleteProcedure = protectedProcedure
	.input(getStravaAthleteInputSchema.optional())
	.query(({ ctx, input = {} }) => getStravaAthleteQuery(input, ctx));
