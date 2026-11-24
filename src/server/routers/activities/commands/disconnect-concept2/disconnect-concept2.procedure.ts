import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { disconnectConcept2Command } from "./disconnect-concept2.command";

export const disconnectConcept2Procedure = protectedProcedure.mutation(
	({ ctx }) => disconnectConcept2Command(undefined, ctx),
);
