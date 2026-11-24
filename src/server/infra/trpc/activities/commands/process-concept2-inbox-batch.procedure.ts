import { z } from "zod";
import { processConcept2InboxBatchMemberCommand } from "@/server/domain/activities/commands/process-concept2-inbox-batch/process-concept2-inbox-batch.member.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

const inputSchema = z.object({ batchId: z.string() });

export const processConcept2InboxBatchProcedure = protectedProcedure
	.input(inputSchema)
	.mutation(({ ctx, input }) =>
		processConcept2InboxBatchMemberCommand(input, ctx),
	);
