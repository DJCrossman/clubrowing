import type { ViewerContext } from "@/server/domain/common/context";
import { generateCalendarToken } from "@/server/domain/schedule/common/calendar-token";

export async function rotateCalendarTokenCommand(
	_input: undefined,
	{ db, user }: ViewerContext,
) {
	const token = generateCalendarToken();
	await db.calendar_token.upsert({
		where: { userId: user.id },
		create: { userId: user.id, token },
		update: { token },
	});
	return { token };
}
