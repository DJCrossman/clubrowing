import { getAthleteStatsQuery } from "@/domain/athletes/queries/get-athlete-stats/get-athlete-stats.query";
import { getAthleteStatsInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getAthleteStatsProcedure = viewerProcedure
	.input(getAthleteStatsInputSchema)
	.query(({ ctx, input }) => getAthleteStatsQuery(input, ctx));
