import type { Context } from "@/domain/common/context";
import { resolveCalendarViewer } from "@/domain/schedule/common/resolve-calendar-viewer";
import { formatEventDate, formatEventTime } from "@/lib/schedule/event-labels";

export async function getCalendarReplyQuery(
	{ token, eventId }: { token: string; eventId: string },
	{ db }: Pick<Context, "db">,
) {
	const athleteId = (await resolveCalendarViewer(db, token))?.athleteId;
	if (!athleteId) {
		return null;
	}
	const event = await db.event.findUnique({
		where: { id: eventId },
		select: {
			id: true,
			title: true,
			type: true,
			startAt: true,
			endAt: true,
			allDay: true,
			timezone: true,
			rsvps: { where: { athleteId }, select: { status: true } },
		},
	});
	if (!event) {
		return null;
	}
	return {
		athleteId,
		event: {
			id: event.id,
			title: event.title,
			type: event.type,
			subtitle: `${formatEventDate(event.startAt, event.timezone)} · ${formatEventTime(event)}`,
		},
		status: event.rsvps[0]?.status ?? null,
	};
}
