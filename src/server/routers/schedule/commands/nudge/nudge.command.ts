import type { EventIdInput } from "@/schemas";
import type { AdminContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { getEventAudiences } from "@/server/routers/schedule/common/event-audience";
import { sendNudge } from "@/server/routers/schedule/common/send-nudge";

export async function nudgeCommand(
	{ eventId }: EventIdInput,
	{ db, services }: AdminContext,
) {
	if (!services.push.isConfigured) {
		throw new DomainError(
			"PRECONDITION_FAILED",
			"Push notifications are not configured on the server.",
		);
	}
	const event = await db.event.findUnique({
		where: { id: eventId },
		include: {
			groups: { select: { groupId: true } },
			rsvps: { select: { athleteId: true } },
		},
	});
	if (!event) {
		throw new DomainError("NOT_FOUND", "Event not found");
	}
	const audience = (await getEventAudiences(db, [event])).get(event.id) ?? [];
	const responded = new Set(event.rsvps.map(({ athleteId }) => athleteId));
	const athleteIds = [...audience].filter((id) => !responded.has(id));

	const { reached } = await sendNudge(services.push, { event, athleteIds });
	return { count: athleteIds.length, reached };
}
