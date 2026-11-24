import { after } from "next/server";
import type { SessionSnapshot } from "@/lib/schedule/changes";
import type { SaveTrainingWeek } from "@/schemas";
import type { AdminContext } from "@/server/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { attachLoggedActivitiesToWorkout } from "@/server/routers/activities/common/scheduled-workout";
import {
	createEventRow,
	updateEventRow,
} from "@/server/routers/schedule/common/event-writes";
import type { EventRow } from "@/server/routers/schedule/common/map-to-event-dto";
import {
	notifiableEventSelect,
	planChangeNotifications,
	toEventSnapshot,
} from "@/server/routers/schedule/common/schedule-change-notifications";

export async function saveTrainingWeekCommand(
	input: SaveTrainingWeek,
	{ db, athlete }: AdminContext,
) {
	const touchedIds = [...input.updates.map(({ id }) => id), ...input.deleteIds];
	const existing = await db.event.findMany({
		where: { id: { in: touchedIds } },
		select: { ...notifiableEventSelect, workoutId: true },
	});
	const existingById = new Map(existing.map((event) => [event.id, event]));
	assertTrainingOnly(input, touchedIds, existingById);

	const newlyPlannedSessions: EventRow[] = [];
	// A full week is a few dozen sequential writes over the Neon adapter, which
	// can outlast Prisma's 5s interactive-transaction default.
	await db.$transaction(
		async (tx) => {
			if (input.deleteIds.length) {
				const workoutIds = input.deleteIds
					.map((id) => existingById.get(id)?.workoutId)
					.filter((id): id is string => !!id);
				await tx.event.deleteMany({ where: { id: { in: input.deleteIds } } });
				await tx.workout.deleteMany({ where: { id: { in: workoutIds } } });
			}
			for (const { id, ...update } of input.updates) {
				const row = await updateEventRow(
					tx,
					id,
					update,
					existingById.get(id)?.workoutId ?? null,
				);
				if (!existingById.get(id)?.workoutId) newlyPlannedSessions.push(row);
			}
			for (const create of input.creates) {
				newlyPlannedSessions.push(
					await createEventRow(tx, create, athlete?.id ?? null),
				);
			}
		},
		{ timeout: 20_000 },
	);
	for (const { workout, startAt } of newlyPlannedSessions) {
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
	}

	const afterById = new Map<string, SessionSnapshot | null>([
		...input.updates.map(
			(update) => [update.id, toEventSnapshot(update.id, update)] as const,
		),
		...input.deleteIds.map((id) => [id, null] as const),
	]);

	return {
		created: input.creates.length,
		updated: input.updates.length,
		deletedIds: input.deleteIds,
		notifications: input.notify
			? planChangeNotifications(existing, afterById)
			: [],
	};
}

function assertTrainingOnly(
	input: SaveTrainingWeek,
	touchedIds: string[],
	existingById: Map<string, { type: string }>,
) {
	for (const id of touchedIds) {
		const event = existingById.get(id);
		if (!event) {
			throw new DomainError("NOT_FOUND", "Event not found");
		}
		if (event.type !== "training") {
			throw new DomainError(
				"BAD_REQUEST",
				"Only training sessions can be bulk edited",
			);
		}
	}
	if ([...input.creates, ...input.updates].some((e) => e.type !== "training")) {
		throw new DomainError(
			"BAD_REQUEST",
			"Only training sessions can be bulk edited",
		);
	}
}
