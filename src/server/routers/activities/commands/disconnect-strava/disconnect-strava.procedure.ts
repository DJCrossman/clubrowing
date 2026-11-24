import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { disconnectStravaCommand } from "./disconnect-strava.command";

export const disconnectStravaProcedure = protectedProcedure.mutation(
	({ ctx }) => disconnectStravaCommand(undefined, ctx),
);
