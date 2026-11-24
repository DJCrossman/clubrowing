import { connectStravaInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { connectStravaCommand } from "./connect-strava.command";

export const connectStravaProcedure = protectedProcedure
	.input(connectStravaInputSchema)
	.mutation(({ ctx, input }) => connectStravaCommand(input, ctx));
