import { getAthleteStatsInputSchema } from "@/schemas";
import { getAthleteStatsQuery } from "@/server/domain/athletes/queries/get-athlete-stats/get-athlete-stats.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getAthleteStatsProcedure = viewerProcedure
	.input(getAthleteStatsInputSchema)
	.query(({ ctx, input }) => getAthleteStatsQuery(input, ctx));
