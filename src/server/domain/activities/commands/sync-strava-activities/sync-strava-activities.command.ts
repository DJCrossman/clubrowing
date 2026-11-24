import type { AuthenticatedContext } from "@/domain/common/context";
import { createLogger } from "@/lib/logger";
import { syncStravaActivitiesFinalizeCallback } from "./sync-strava-activities.finalize";

const logger = createLogger("sync.strava");

export async function syncStravaActivitiesCommand(
	_input: undefined,
	{ db, athlete, user, services }: AuthenticatedContext,
) {
	logger.info("sync requested", { userId: user.id, athleteId: athlete.id });

	const batch = await db.activity_inbox.create({
		data: {
			athleteId: athlete.id,
			source: "strava",
			kind: "sync",
			payload: [],
		},
	});

	services.taskManager.runAfterResponse(() =>
		syncStravaActivitiesFinalizeCallback({
			ctx: { db, athlete, services },
			batchId: batch.id,
		}),
	);
	return { batchId: batch.id };
}
