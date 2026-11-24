import type { GetActivityByIdInput } from "@/schemas";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { canViewActivity } from "@/server/routers/activities/common/can-view-activity";
import {
	activityInclude,
	mapToActivityDto,
} from "@/server/routers/activities/common/map-to-activity-dto";

export async function getActivityByIdMemberQuery(
	input: GetActivityByIdInput,
	{ db, user, athlete }: Pick<ViewerContext, "db" | "user" | "athlete">,
) {
	if (!input.id) return null;
	const row = await db.activity.findUnique({
		where: { id: input.id },
		include: activityInclude,
	});
	if (!row) return null;
	if (!canViewActivity({ activity: row, user, athlete })) {
		throw new DomainError(
			"FORBIDDEN",
			"Cannot view another athlete's activity",
		);
	}
	return mapToActivityDto(row);
}
