import { protectedProcedure } from "@/server/procedures";
import { syncConcept2ActivitiesCommand } from "./sync-concept2-activities.command";

export const syncConcept2ActivitiesProcedure = protectedProcedure.mutation(
	({ ctx }) => syncConcept2ActivitiesCommand(undefined, ctx),
);
