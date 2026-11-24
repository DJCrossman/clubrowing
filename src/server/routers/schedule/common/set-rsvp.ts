import type { RsvpStatus } from "@/schemas";
import type { Context } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { isInEventAudience } from "./event-audience";

export async function setRsvp(
	db: Context["db"],
	{
		eventId,
		athleteId,
		status,
	}: { eventId: string; athleteId: string; status: RsvpStatus | null },
) {
	return db.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT "id" FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;
		const event = await tx.event.findUnique({
			where: { id: eventId },
			include: {
				groups: { select: { groupId: true } },
				rsvps: { where: { status: "yes" }, select: { athleteId: true } },
			},
		});
		if (!event) {
			throw new DomainError("NOT_FOUND", "Event not found");
		}
		if (!(await isInEventAudience(db, event, athleteId))) {
			throw new DomainError("FORBIDDEN", "This event isn't open to you");
		}
		if (status === null) {
			await tx.event_rsvp.deleteMany({ where: { eventId, athleteId } });
			return { eventId, status };
		}
		if (event.type === "volunteer") {
			if (status !== "yes") {
				throw new DomainError(
					"BAD_REQUEST",
					"Volunteer shifts only take sign-ups",
				);
			}
			const others = event.rsvps.filter((rsvp) => rsvp.athleteId !== athleteId);
			if (others.length >= (event.volunteerSpots ?? 0)) {
				throw new DomainError("CONFLICT", "This shift is full");
			}
		}
		await tx.event_rsvp.upsert({
			where: { eventId_athleteId: { eventId, athleteId } },
			create: { eventId, athleteId, status },
			update: { status },
		});
		return { eventId, status };
	});
}
