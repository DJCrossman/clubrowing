import { z } from "zod";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { processConcept2InboxBatchMemberCommand } from "./process-concept2-inbox-batch.member.command";

const inputSchema = z.object({ batchId: z.string() });

export const processConcept2InboxBatchProcedure = protectedProcedure
	.input(inputSchema)
	.mutation(({ ctx, input }) =>
		processConcept2InboxBatchMemberCommand(input, ctx),
	);
