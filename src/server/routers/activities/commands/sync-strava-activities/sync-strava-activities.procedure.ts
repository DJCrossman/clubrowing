import { protectedProcedure } from "@/server/procedures";
import { syncStravaActivitiesCommand } from "./sync-strava-activities.command";

export const syncStravaActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncStravaActivitiesCommand(undefined, ctx),
);
