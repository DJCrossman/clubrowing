import { syncConcept2ActivitiesCommand } from "@/domain/activities/commands/sync-concept2-activities/sync-concept2-activities.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const syncConcept2ActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncConcept2ActivitiesCommand(undefined, ctx),
);
