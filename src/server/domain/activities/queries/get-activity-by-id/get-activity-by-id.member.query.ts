import { canViewActivity } from "@/domain/activities/common/can-view-activity";
import {
	activityInclude,
	mapToActivityDto,
} from "@/domain/activities/common/map-to-activity-dto";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { GetActivityByIdInput } from "@/schemas";

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
