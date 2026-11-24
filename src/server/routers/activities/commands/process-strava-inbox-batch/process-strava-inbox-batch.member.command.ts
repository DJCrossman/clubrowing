import { after } from "next/server";
import { createLogger } from "@/lib/logger";
import type { AuthenticatedContext } from "@/server/domain/common/context";
import {
	type ProcessStravaInboxBatchInput,
	processStravaInboxBatchCommand,
} from "./process-strava-inbox-batch.command";

const logger = createLogger("inbox.processor.strava");

export async function processStravaInboxBatchMemberCommand(
	input: ProcessStravaInboxBatchInput,
	{ db }: Pick<AuthenticatedContext, "db">,
) {
	try {
		return await processStravaInboxBatchCommand(input, { db });
	} catch (error) {
		after(async () => {
			const message = error instanceof Error ? error.message : String(error);
			logger.error("batch failed", { batchId: input.batchId, error: message });
			await db.activity_inbox.update({
				where: { id: input.batchId },
				data: {
					status: "failed",
					completedAt: new Date(),
					errorMessage: message,
				},
			});
		});
		throw error;
	}
}
