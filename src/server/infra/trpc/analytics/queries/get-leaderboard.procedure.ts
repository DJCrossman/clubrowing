import { getLeaderboardQuery } from "@/domain/analytics/queries/get-leaderboard/get-leaderboard.query";
import { getLeaderboardInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getLeaderboardProcedure = viewerProcedure
	.input(getLeaderboardInputSchema)
	.query(({ ctx, input }) => getLeaderboardQuery(input, ctx));
