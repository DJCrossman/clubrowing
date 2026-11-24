import type { AuthenticatedContext } from "@/domain/common/context";
import type { SetNotificationPreference } from "@/schemas";

export async function setPreferenceCommand(
	input: SetNotificationPreference,
	{ db, athlete }: AuthenticatedContext,
) {
	const preference = await db.notification_preference.upsert({
		where: { athleteId_scope: { athleteId: athlete.id, scope: input.scope } },
		create: {
			athleteId: athlete.id,
			scope: input.scope,
			enabled: input.enabled,
		},
		update: { enabled: input.enabled },
		select: { scope: true, enabled: true },
	});

	return preference;
}
