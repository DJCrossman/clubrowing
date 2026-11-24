import type { GetErgByIdInput } from "@/schemas";
import type { ViewerContext } from "@/server/domain/common/context";
import { ergsVisibleTo } from "@/server/domain/ergs/common/ergs-visible-to";
import {
	ergInclude,
	mapToErgDto,
} from "@/server/domain/ergs/common/map-to-erg-dto";

export async function getErgByIdQuery(
	input: GetErgByIdInput,
	{ db, user, athlete }: ViewerContext,
) {
	const erg = await db.erg.findFirst({
		where: { id: input.id, ...ergsVisibleTo({ user, athlete }) },
		include: ergInclude,
	});
	if (!erg) return null;

	const [agg, rowedByViewer] = await Promise.all([
		db.activity.aggregate({
			where: { ergId: input.id, type: "erg" },
			_sum: { distance: true },
		}),
		athlete &&
			db.activity.findFirst({
				where: { ergId: input.id, athleteId: athlete.id },
				select: { id: true },
			}),
	]);

	return {
		...mapToErgDto({ erg, meters: agg._sum.distance ?? 0 }),
		canMark: erg.ownership === "club" && !!rowedByViewer,
	};
}
