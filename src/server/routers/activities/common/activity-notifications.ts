import type { activity as Activity } from "@/generated/prisma/client";
import { formatCompactDuration } from "@/lib/formatters/formatDuration";
import { formatMeters } from "@/lib/formatters/formatMeters";
import {
	NOTIFICATION_SCOPE_ACTIVITIES,
	type PushMessage,
} from "@/lib/notifications";
import { routes } from "@/lib/routes";
import type { PushService } from "@/server/services/push-service";

type AddedActivity = Pick<
	Activity,
	"id" | "athleteId" | "name" | "distance" | "elapsedTime"
>;

export function notifyActivityAdded(
	push: PushService,
	activity: AddedActivity,
) {
	return push.sendPush(
		[activity.athleteId],
		buildActivityAddedMessage(activity),
	);
}

export function buildActivityAddedMessage(
	activity: AddedActivity,
): PushMessage {
	return {
		title: "Activity added",
		body: `${activity.name} — ${formatMeters(activity.distance)}, ${formatCompactDuration(activity.elapsedTime)}`,
		url: routes.activities.view(activity.id),
		// Several arriving at once replace each other on the device instead of stacking.
		tag: "activity-added",
		scope: NOTIFICATION_SCOPE_ACTIVITIES,
	};
}
