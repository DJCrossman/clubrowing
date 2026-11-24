import type { AuthenticatedContext } from "@/domain/common/context";
import { createLogger } from "@/lib/logger";
import type { SubscribeToPush } from "@/schemas";

const logger = createLogger("notifications.subscribe");

export async function subscribeCommand(
	input: SubscribeToPush,
	{ db, athlete }: AuthenticatedContext,
) {
	const data = {
		athleteId: athlete.id,
		p256dh: input.keys.p256dh,
		auth: input.keys.auth,
		userAgent: input.userAgent ?? null,
	};
	const subscription = await db.push_subscription.upsert({
		where: { endpoint: input.endpoint },
		create: { endpoint: input.endpoint, ...data },
		update: { ...data, failedAt: null },
		select: { id: true },
	});
	logger.info("subscribed", {
		athleteId: athlete.id,
		subscriptionId: subscription.id,
	});

	return { id: subscription.id };
}
