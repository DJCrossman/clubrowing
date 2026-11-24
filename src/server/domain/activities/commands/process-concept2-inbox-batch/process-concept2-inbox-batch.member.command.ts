import type { AuthenticatedContext } from "@/domain/common/context";
import { createLogger } from "@/lib/logger";
import {
	type ProcessConcept2InboxBatchInput,
	processConcept2InboxBatchCommand,
} from "./process-concept2-inbox-batch.command";

const logger = createLogger("inbox.processor.concept2");

export async function processConcept2InboxBatchMemberCommand(
	input: ProcessConcept2InboxBatchInput,
	{ db, services }: Pick<AuthenticatedContext, "db" | "services">,
) {
	try {
		return await processConcept2InboxBatchCommand(input, { db });
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
