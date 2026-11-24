import type { GetEventByIdInput } from "@/schemas";
import type { ViewerContext } from "@/server/domain/common/context";
import { getViewerGroups } from "@/server/domain/groups/common";
import {
	eventInclude,
	mapToVisibleEventDtos,
} from "@/server/domain/schedule/common/map-to-event-dto";

export async function getEventByIdQuery(
	input: GetEventByIdInput,
	ctx: ViewerContext,
) {
	const { db } = ctx;
	const row = await db.event.findUnique({
		where: { id: input.id },
		include: eventInclude,
	});
	if (!row) {
		return null;
	}
	const [event] = await mapToVisibleEventDtos(
		ctx,
		[row],
		await getViewerGroups(ctx),
	);
	return event ?? null;
}
