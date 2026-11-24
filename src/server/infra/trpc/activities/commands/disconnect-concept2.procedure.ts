import { disconnectConcept2Command } from "@/server/domain/activities/commands/disconnect-concept2/disconnect-concept2.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const disconnectConcept2Procedure = protectedProcedure.mutation(
	({ ctx }) => disconnectConcept2Command(undefined, ctx),
);
