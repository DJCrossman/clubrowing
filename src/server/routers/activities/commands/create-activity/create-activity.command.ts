import { after } from "next/server";
import type { CreateActivity } from "@/schemas";
import type { ViewerContext } from "@/server/context";
import { notifyActivityAdded } from "@/server/routers/activities/common/activity-notifications";
import {
	activityInclude,
	mapToActivityDto,
} from "@/server/routers/activities/common/map-to-activity-dto";

export async function createActivityCommand(
	input: CreateActivity,
	{ db, services, athlete }: Pick<ViewerContext, "db" | "services" | "athlete">,
) {
	const row = await db.activity.create({
		data: {
			name: input.name,
			startDate: new Date(input.startDate),
			timezone: input.timezone,
			workoutType: input.workoutType,
			elapsedTime: input.elapsedTime,
			distance: input.distance,
			athleteId: input.athleteId,
			workoutId: input.workoutId ?? null,
			type: input.type,
			...(input.type === "water"
				? { boatId: input.boatId }
				: { ergId: input.ergId }),
		},
		include: activityInclude,
	});
	if (row.athleteId !== athlete?.id) {
		after(() => notifyActivityAdded(services.push, row));
	}
	return mapToActivityDto(row);
}
