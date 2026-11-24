import { z } from "zod";
import { protectedProcedure } from "@/server/procedures";
import { processStravaInboxBatchMemberCommand } from "./process-strava-inbox-batch.member.command";

const inputSchema = z.object({ batchId: z.string() });

export const processStravaInboxBatchProcedure = protectedProcedure
	.input(inputSchema)
	.mutation(({ ctx, input }) =>
		processStravaInboxBatchMemberCommand(input, ctx),
	);
