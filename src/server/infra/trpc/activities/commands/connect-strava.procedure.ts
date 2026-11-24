import { connectStravaCommand } from "@/domain/activities/commands/connect-strava/connect-strava.command";
import { connectStravaInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const connectStravaProcedure = protectedProcedure
	.input(connectStravaInputSchema)
	.mutation(({ ctx, input }) => connectStravaCommand(input, ctx));
