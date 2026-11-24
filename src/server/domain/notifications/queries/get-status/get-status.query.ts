import type { AuthenticatedContext } from "@/domain/common/context";
import type { NotificationPreferences } from "@/lib/notifications";

export async function getStatusQuery(
	_input: undefined,
	{ db, athlete, services }: AuthenticatedContext,
) {
	const [subscriptions, preferences] = await Promise.all([
		db.push_subscription.findMany({
			where: { athleteId: athlete.id },
			select: { endpoint: true },
		}),
		db.notification_preference.findMany({
			where: { athleteId: athlete.id },
			select: { scope: true, enabled: true },
		}),
	]);

	return {
		configured: services.push.isConfigured,
		publicKey: services.push.publicKey,
		hasSubscription: subscriptions.length > 0,
		endpoints: subscriptions.map((subscription) => subscription.endpoint),
		preferences: Object.fromEntries(
			preferences.map((preference) => [preference.scope, preference.enabled]),
		) as NotificationPreferences,
	};
}
