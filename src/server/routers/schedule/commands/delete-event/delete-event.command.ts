import type { DeleteEventInput } from "@/schemas";
import type { AdminContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import {
	notifiableEventSelect,
	planChangeNotifications,
	sendAfterResponse,
} from "@/server/routers/schedule/common/schedule-change-notifications";

export async function deleteEventCommand(
	{ id, notify }: DeleteEventInput,
	{ db, services }: AdminContext,
) {
	const event = await db.event.findUnique({
		where: { id },
		select: { ...notifiableEventSelect, workoutId: true },
	});
	if (!event) {
		throw new DomainError("NOT_FOUND", "Event not found");
	}
	await db.$transaction(async (tx) => {
		await tx.event.delete({ where: { id } });
		if (event.workoutId) {
			await tx.workout.delete({ where: { id: event.workoutId } });
		}
	});
	sendAfterResponse(
		services.push,
		notify ? planChangeNotifications([event], new Map([[id, null]])) : [],
	);
	return { id };
}
