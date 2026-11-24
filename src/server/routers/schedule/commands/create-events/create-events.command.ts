import { after } from "next/server";
import type { CreateEvents } from "@/schemas";
import type { AdminContext } from "@/server/context";
import { attachLoggedActivitiesToWorkout } from "@/server/routers/activities/common/scheduled-workout";
import {
	createEventRow,
	fillEmptySession,
} from "@/server/routers/schedule/common/event-writes";

const CONCURRENCY = 8;

export async function createEventsCommand(
	input: CreateEvents,
	{
		db,
		athlete,
	}: {
		db: Pick<AdminContext["db"], "$transaction">;
		athlete: { id: string } | null;
	},
) {
	// A season of sessions is hundreds of round trips over the Neon adapter, too
	// slow for one interactive transaction, so each event is its own transaction
	// and several are written at once.
	const queue = [...input.events];
	const startTimes: Date[] = [];
	let filled = 0;
	let failed = 0;
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			for (let event = queue.shift(); event; event = queue.shift()) {
				const current = event;
				try {
					const { startAt, isFilled, workout } = await db.$transaction(
						async (tx) => {
							const session = await fillEmptySession({ tx, input: current });
							if (session) {
								return {
									startAt: session.startAt,
									isFilled: true,
									workout: session.workout,
								};
							}
							const row = await createEventRow(
								tx,
								current,
								athlete?.id ?? null,
							);
							return {
								startAt: row.startAt,
								isFilled: false,
								workout: row.workout,
							};
						},
					);
					startTimes.push(startAt);
					if (isFilled) filled++;
					if (workout) {
						after(() =>
							attachLoggedActivitiesToWorkout({
								db,
								event: {
									workoutId: workout.id,
									startAt,
									activityType: workout.activityType,
								},
							}),
						);
					}
				} catch {
					failed++;
				}
			}
		}),
	);
	return {
		created: startTimes.length - filled,
		filled,
		failed,
		firstStartAt: startTimes
			.map((startAt) => startAt.toISOString())
			.sort()[0] as string | undefined,
	};
}
