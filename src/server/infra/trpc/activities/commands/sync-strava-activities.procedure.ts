import { syncStravaActivitiesCommand } from "@/domain/activities/commands/sync-strava-activities/sync-strava-activities.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const syncStravaActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncStravaActivitiesCommand(undefined, ctx),
);
