import type { SetActivityHiddenInput } from "@/schemas";
import type { Context } from "@/server/context";
import {
	activityInclude,
	mapToActivityDto,
} from "@/server/routers/activities/common/map-to-activity-dto";

export async function setActivityHiddenCommand(
	input: SetActivityHiddenInput,
	{ db }: Context,
) {
	const row = await db.activity.update({
		where: { id: input.id },
		data: { isHidden: input.isHidden },
		include: activityInclude,
	});
	return mapToActivityDto(row);
}
