import { DateTime } from "luxon";
import type { ViewerContext } from "@/domain/common/context";
import { getGroupMemberIds } from "@/domain/groups/common";
import type { GetGroupByIdInput } from "@/schemas";
import { toMetersTimeSeries } from "../../common/to-meters-time-series";

const SERIES_DAYS = 90;

export async function getGroupMetersQuery(
	{ id }: GetGroupByIdInput,
	{ db }: ViewerContext,
) {
	const athleteIds = await getGroupMemberIds(db, id);
	const rows = athleteIds.length
		? await db.activity.findMany({
				where: {
					athleteId: { in: athleteIds },
					startDate: {
						gte: DateTime.now()
							.minus({ days: SERIES_DAYS })
							.startOf("day")
							.toJSDate(),
					},
				},
				select: { startDate: true, type: true, distance: true },
				orderBy: { startDate: "asc" },
			})
		: [];
	return { metersTimeSeries: toMetersTimeSeries(rows) };
}
