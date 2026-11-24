import type { Context } from "@/domain/common/context";

export async function resolveCalendarViewer(
	{
		db,
		services,
	}: Pick<Context, "db"> & {
		services: Pick<Context["services"], "userService">;
	},
	token: string,
): Promise<{ userId: string; athleteId: string | null } | null> {
	const calendarToken = await db.calendar_token.findUnique({
		where: { token },
		select: { userId: true },
	});
	if (!calendarToken) {
		return null;
	}
	const { userId } = calendarToken;
	const athlete = await db.athlete.findUnique({
		where: { userId },
		select: { id: true },
	});
	if (athlete) {
		return { userId, athleteId: athlete.id };
	}
	const isAdmin = await services.userService.isAdmin(userId).catch(() => false);
	return isAdmin ? { userId, athleteId: null } : null;
}
