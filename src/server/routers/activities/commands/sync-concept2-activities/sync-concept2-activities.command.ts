import { after } from "next/server";
import { createLogger } from "@/lib/logger";
import type { AuthenticatedContext } from "@/server/domain/common/context";
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

	after(() =>
		syncConcept2ActivitiesFinalizeCallback({
			ctx: { db, athlete, services },
			batchId: batch.id,
		}),
	);
	return { batchId: batch.id };
}
