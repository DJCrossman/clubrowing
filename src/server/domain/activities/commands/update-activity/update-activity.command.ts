import type { UpdateActivity } from "@/schemas";
import {
	activityInclude,
	mapToActivityDto,
} from "@/server/domain/activities/common/map-to-activity-dto";
import type { Context } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";

export async function updateActivityCommand(
	input: UpdateActivity,
	{ db }: Pick<Context, "db">,
) {
	if (input.type === "water") {
		const existing = await db.activity.findUnique({
			where: { id: input.id },
			select: { conceptTwoId: true },
		});
		if (existing?.conceptTwoId != null) {
			throw new DomainError(
				"BAD_REQUEST",
				"A Concept2 result is always an erg activity.",
			);
		}
	}
	const row = await db.activity.update({
		where: { id: input.id },
		data: {
			name: input.name,
			startDate: new Date(input.startDate),
			timezone: input.timezone,
			workoutType: input.workoutType,
			elapsedTime: input.elapsedTime,
			distance: input.distance,
			athleteId: input.athleteId,
			workoutId: input.workoutId ?? null,
			isHidden: input.isHidden,
			type: input.type,
			...(input.type === "water"
				? { boatId: input.boatId, ergId: null }
				: { ergId: input.ergId, boatId: null }),
		},
		include: activityInclude,
	});
	return mapToActivityDto(row);
}
