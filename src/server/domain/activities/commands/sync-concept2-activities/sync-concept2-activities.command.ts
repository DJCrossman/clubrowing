import type { AuthenticatedContext } from "@/domain/common/context";
import { createLogger } from "@/lib/logger";
import { syncConcept2ActivitiesFinalizeCallback } from "./sync-concept2-activities.finalize";

const logger = createLogger("sync.concept2");

export async function syncConcept2ActivitiesCommand(
	_input: undefined,
	{ db, athlete, user, services }: AuthenticatedContext,
) {
	logger.info("sync requested", { userId: user.id, athleteId: athlete.id });

	const batch = await db.activity_inbox.create({
		data: {
			athleteId: athlete.id,
			source: "concept2",
			kind: "sync",
			payload: [],
		},
	});

	services.taskManager.runAfterResponse(() =>
		syncConcept2ActivitiesFinalizeCallback({
			ctx: { db, athlete, services },
			batchId: batch.id,
		}),
	);
	return { batchId: batch.id };
}
