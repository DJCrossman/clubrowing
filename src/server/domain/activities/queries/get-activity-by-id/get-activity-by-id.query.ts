import { canViewActivity } from "@/domain/activities/common/can-view-activity";
import {
	activityInclude,
	mapToActivityDto,
} from "@/domain/activities/common/map-to-activity-dto";
import type { ViewerContext } from "@/domain/common/context";
import type { GetActivityByIdInput } from "@/schemas";

export async function getActivityByIdQuery(
	input: GetActivityByIdInput,
	{ db, user, athlete }: Pick<ViewerContext, "db" | "user" | "athlete">,
) {
	if (!input.id) return null;
	const row = await db.activity.findUnique({
		where: { id: input.id },
		include: activityInclude,
	});
	return row && canViewActivity({ activity: row, user, athlete })
		? mapToActivityDto(row)
		: null;
}
