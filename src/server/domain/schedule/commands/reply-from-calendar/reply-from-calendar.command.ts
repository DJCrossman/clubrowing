import type { Context } from "@/domain/common/context";
import type { CalendarReplyStatus } from "@/domain/schedule/common/calendar-reply";
import { setRsvp } from "@/domain/schedule/common/set-rsvp";
import { getCalendarReplyQuery } from "@/domain/schedule/queries/get-calendar-reply/get-calendar-reply.query";

export async function replyFromCalendarCommand(
	{
		token,
		eventId,
		status,
	}: { token: string; eventId: string; status: CalendarReplyStatus },
	{
		db,
		services,
	}: Pick<Context, "db"> & {
		services: Pick<Context["services"], "userService">;
	},
) {
	const reply = await getCalendarReplyQuery(
		{ token, eventId },
		{ db, services },
	);
	if (!reply) {
		return null;
	}
	const { status: saved } = await setRsvp(db, {
		eventId,
		athleteId: reply.athleteId,
		status: status === "none" ? null : status,
	});
	return { ...reply, status: saved };
}
