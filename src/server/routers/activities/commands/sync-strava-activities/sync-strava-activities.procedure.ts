import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { syncStravaActivitiesCommand } from "./sync-strava-activities.command";

export const syncStravaActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncStravaActivitiesCommand(undefined, ctx),
);
