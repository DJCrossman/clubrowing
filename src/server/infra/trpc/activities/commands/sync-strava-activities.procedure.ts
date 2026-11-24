import { syncStravaActivitiesCommand } from "@/server/domain/activities/commands/sync-strava-activities/sync-strava-activities.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const syncStravaActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncStravaActivitiesCommand(undefined, ctx),
);
