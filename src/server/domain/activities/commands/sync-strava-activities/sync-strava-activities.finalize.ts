import type { AuthenticatedContext } from "@/domain/common/context";
import type { Prisma } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";
import { getStravaAccessToken } from "../../common/get-strava-access-token";
import { processStravaInboxBatchCommand } from "../process-strava-inbox-batch/process-strava-inbox-batch.command";

const logger = createLogger("sync.strava");

export const syncStravaActivitiesFinalizeCallback = async ({
	ctx,
	batchId,
}: {
	ctx: Pick<AuthenticatedContext, "db" | "athlete" | "services">;
	batchId: string;
}) => {
	const { db, services } = ctx;
	try {
		const accessToken = await getStravaAccessToken(ctx);
		if (!accessToken) {
			throw new Error("Strava authentication required");
		}
		const [stravaResult] = await Promise.allSettled([
			services.strava.fetchAllRowingActivities(accessToken),
		]);

		if (stravaResult.status === "rejected") {
			const message =
				stravaResult.reason instanceof Error
					? stravaResult.reason.message
					: String(stravaResult.reason);
			logger.error("upstream fetch failed", { error: message });
			throw new Error(message);
		}
		const rowingItems = stravaResult.value;
		await db.activity_inbox.update({
			where: { id: batchId },
			data: { payload: rowingItems as Prisma.InputJsonValue },
		});

		const [batchResult] = await Promise.allSettled([
			processStravaInboxBatchCommand({ batchId }, { db }),
		]);
		if (batchResult.status === "rejected") {
			const message =
				batchResult.reason instanceof Error
					? batchResult.reason.message
					: String(batchResult.reason);
			logger.error("batch failed", { batchId, error: message });
			throw new Error(message);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error("post-response processing threw", {
			batchId,
			error: message,
		});

		await db.activity_inbox.update({
			where: { id: batchId },
			data: {
				status: "failed",
				errorMessage: message,
				completedAt: new Date(),
			},
		});
	}
};
