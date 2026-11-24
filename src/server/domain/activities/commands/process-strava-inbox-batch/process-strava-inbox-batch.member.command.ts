import type { AuthenticatedContext } from "@/domain/common/context";
import { createLogger } from "@/lib/logger";
import {
	type ProcessStravaInboxBatchInput,
	processStravaInboxBatchCommand,
} from "./process-strava-inbox-batch.command";

const logger = createLogger("inbox.processor.strava");

export async function processStravaInboxBatchMemberCommand(
	input: ProcessStravaInboxBatchInput,
	{ db, services }: Pick<AuthenticatedContext, "db" | "services">,
) {
	try {
		return await processStravaInboxBatchCommand(input, { db });
	} catch (error) {
		services.taskManager.runAfterResponse(async () => {
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
