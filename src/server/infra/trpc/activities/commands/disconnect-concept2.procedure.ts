import { disconnectConcept2Command } from "@/domain/activities/commands/disconnect-concept2/disconnect-concept2.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const disconnectConcept2Procedure = protectedProcedure.mutation(
	({ ctx }) => disconnectConcept2Command(undefined, ctx),
);
