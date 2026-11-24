import {
	EARLIEST_START_BEFORE_EVENT_MS,
	LATEST_START_AFTER_EVENT_MS,
} from "@/lib/schedule/week";
import type { Workouts } from "@/lib/trpc/types";

export function findScheduledWorkoutId({
	workouts,
	type,
	startDate,
}: {
	workouts: Pick<
		Workouts[number],
		"id" | "eventId" | "activityType" | "startDate"
	>[];
	type: Workouts[number]["activityType"];
	startDate: string;
}) {
	const startTime = Date.parse(startDate);
	return workouts
		.filter((workout) => {
			const sinceSessionStart = startTime - Date.parse(workout.startDate);
			return (
				workout.eventId !== null &&
				workout.activityType === type &&
				sinceSessionStart >= -EARLIEST_START_BEFORE_EVENT_MS &&
				sinceSessionStart < LATEST_START_AFTER_EVENT_MS
			);
		})
		.sort(
			(a, b) =>
				Math.abs(Date.parse(a.startDate) - startTime) -
				Math.abs(Date.parse(b.startDate) - startTime),
		)[0]?.id;
}
