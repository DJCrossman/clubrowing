import type { ViewerContext } from "@/domain/common/context";
import { getViewerGroups } from "@/domain/groups/common";
import {
	eventInclude,
	mapToVisibleEventDtos,
} from "@/domain/schedule/common/map-to-event-dto";
import {
	bucketByDay,
	getClubToday,
	getWeekDays,
	parseWeekStart,
} from "@/lib/schedule/week";
import type { GetWeekInput } from "@/schemas";

export async function getWeekQuery(input: GetWeekInput, ctx: ViewerContext) {
	const { db } = ctx;
	const weekStart = parseWeekStart(input.weekStart);
	const rows = await db.event.findMany({
		where: {
			startAt: {
				gte: weekStart.minus({ days: 1 }).toJSDate(),
				lt: weekStart.plus({ days: 8 }).toJSDate(),
			},
			type: input.type,
			...(input.groupId && {
				OR: [
					{ audience: "club" },
					{ groups: { some: { groupId: input.groupId } } },
				],
			}),
		},
		include: eventInclude,
		orderBy: [{ allDay: "desc" }, { startAt: "asc" }],
	});
	const events = await mapToVisibleEventDtos(
		ctx,
		rows,
		await getViewerGroups(ctx),
	);
	const today = getClubToday();

	return {
		weekStart: weekStart.toISODate(),
		days: bucketByDay(getWeekDays(weekStart), events, ({ date }) => date).map(
			({ date, items }) => ({ date, isToday: date === today, events: items }),
		),
	};
}
