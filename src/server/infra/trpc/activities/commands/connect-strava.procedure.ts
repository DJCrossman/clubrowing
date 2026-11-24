import { connectStravaInputSchema } from "@/schemas";
import { connectStravaCommand } from "@/server/domain/activities/commands/connect-strava/connect-strava.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const connectStravaProcedure = protectedProcedure
	.input(connectStravaInputSchema)
	.mutation(({ ctx, input }) => connectStravaCommand(input, ctx));
