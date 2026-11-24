import { getLeaderboardInputSchema } from "@/schemas";
import { getLeaderboardQuery } from "@/server/domain/analytics/queries/get-leaderboard/get-leaderboard.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getLeaderboardProcedure = viewerProcedure
	.input(getLeaderboardInputSchema)
	.query(({ ctx, input }) => getLeaderboardQuery(input, ctx));
