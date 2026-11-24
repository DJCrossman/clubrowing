import { disconnectStravaCommand } from "@/domain/activities/commands/disconnect-strava/disconnect-strava.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const disconnectStravaProcedure = protectedProcedure.mutation(
	({ ctx }) => disconnectStravaCommand(undefined, ctx),
);
