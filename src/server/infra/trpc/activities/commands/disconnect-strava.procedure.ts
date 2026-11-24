import { disconnectStravaCommand } from "@/server/domain/activities/commands/disconnect-strava/disconnect-strava.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const disconnectStravaProcedure = protectedProcedure.mutation(
	({ ctx }) => disconnectStravaCommand(undefined, ctx),
);
