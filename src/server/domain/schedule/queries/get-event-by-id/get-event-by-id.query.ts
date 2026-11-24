import type { ViewerContext } from "@/domain/common/context";
import { getViewerGroups } from "@/domain/groups/common";
import {
	eventInclude,
	mapToVisibleEventDtos,
} from "@/domain/schedule/common/map-to-event-dto";
import type { GetEventByIdInput } from "@/schemas";

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
