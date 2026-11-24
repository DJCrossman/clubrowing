import type { GetBoatByIdInput } from "@/schemas";
import { mapToBoatDto } from "@/server/domain/boats/common/map-to-boat-dto";
import type { Context } from "@/server/domain/common/context";

export async function getBoatByIdQuery(
	input: GetBoatByIdInput,
	{ db }: Context,
) {
	const boat = await db.boat.findUnique({ where: { id: input.id } });
	if (!boat) return null;

	const agg = await db.activity.aggregate({
		where: { boatId: input.id, type: "water" },
		_sum: { distance: true },
	});

	return mapToBoatDto({ boat, meters: agg._sum.distance ?? 0 });
}
