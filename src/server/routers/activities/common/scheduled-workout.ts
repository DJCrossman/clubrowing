import type { ActivityType } from "@/generated/prisma/client";
import {
	EARLIEST_START_BEFORE_EVENT_MS,
	LATEST_START_AFTER_EVENT_MS,
} from "@/lib/schedule/week";
import type { Context } from "@/server/domain/common/context";
import {
	type GroupsDb,
	getAthleteGroupIds,
} from "@/server/domain/groups/common";

export async function findScheduledWorkoutForActivity({
	db,
	athleteId,
	activity,
}: {
	db: Pick<Context["db"], "event"> & GroupsDb;
	athleteId: string;
	activity: { type: ActivityType; startDate: Date };
}): Promise<string | null> {
	const startTime = activity.startDate.getTime();
	const events = await db.event.findMany({
		where: {
			workout: { activityType: activity.type },
			startAt: {
				gt: new Date(startTime - LATEST_START_AFTER_EVENT_MS),
				lte: new Date(startTime + EARLIEST_START_BEFORE_EVENT_MS),
			},
		},
		select: {
			workoutId: true,
			startAt: true,
			audience: true,
			groups: { select: { groupId: true } },
		},
		orderBy: { startAt: "asc" },
	});
	const groupIds = new Set(
		events.some(({ audience }) => audience === "groups")
			? await getAthleteGroupIds(db, athleteId)
			: [],
	);
	const closest = events
		.filter(
			(event) =>
				event.audience === "club" ||
				event.groups.length === 0 ||
				event.groups.some(({ groupId }) => groupIds.has(groupId)),
		)
		.sort(
			(a, b) =>
				Math.abs(a.startAt.getTime() - startTime) -
				Math.abs(b.startAt.getTime() - startTime),
		)[0];
	return closest?.workoutId ?? null;
}

export async function attachLoggedActivitiesToWorkout({
	db,
	event,
}: {
	db: Pick<Context["db"], "$transaction">;
	event: { workoutId: string; startAt: Date; activityType: ActivityType };
}): Promise<number> {
	const startTime = event.startAt.getTime();
	if (startTime - Date.now() > EARLIEST_START_BEFORE_EVENT_MS) return 0;
	return db.$transaction(async (tx) => {
		const activities = await tx.activity.findMany({
			where: {
				workoutId: null,
				type: event.activityType,
				startDate: {
					gte: new Date(startTime - EARLIEST_START_BEFORE_EVENT_MS),
					lt: new Date(startTime + LATEST_START_AFTER_EVENT_MS),
				},
			},
			select: { id: true, athleteId: true, type: true, startDate: true },
		});
		const attachedIds: string[] = [];
		for (const activity of activities) {
			const workoutId = await findScheduledWorkoutForActivity({
				db: tx,
				athleteId: activity.athleteId,
				activity,
			});
			if (workoutId === event.workoutId) attachedIds.push(activity.id);
		}
		if (attachedIds.length === 0) return 0;
		const { count } = await tx.activity.updateMany({
			where: { id: { in: attachedIds }, workoutId: null },
			data: { workoutId: event.workoutId },
		});
		return count;
	});
}
