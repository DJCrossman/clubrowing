import { z } from "zod";
import { processStravaInboxBatchMemberCommand } from "@/domain/activities/commands/process-strava-inbox-batch/process-strava-inbox-batch.member.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

const inputSchema = z.object({ batchId: z.string() });

export const processStravaInboxBatchProcedure = protectedProcedure
	.input(inputSchema)
	.mutation(({ ctx, input }) =>
		processStravaInboxBatchMemberCommand(input, ctx),
	);
