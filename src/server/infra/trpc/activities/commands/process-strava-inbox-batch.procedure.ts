import { z } from "zod";
import { processStravaInboxBatchMemberCommand } from "@/server/domain/activities/commands/process-strava-inbox-batch/process-strava-inbox-batch.member.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

const inputSchema = z.object({ batchId: z.string() });

export const processStravaInboxBatchProcedure = protectedProcedure
	.input(inputSchema)
	.mutation(({ ctx, input }) =>
		processStravaInboxBatchMemberCommand(input, ctx),
	);
