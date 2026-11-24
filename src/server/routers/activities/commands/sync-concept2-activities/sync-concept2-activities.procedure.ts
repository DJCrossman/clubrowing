import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { syncConcept2ActivitiesCommand } from "./sync-concept2-activities.command";

export const syncConcept2ActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncConcept2ActivitiesCommand(undefined, ctx),
);
