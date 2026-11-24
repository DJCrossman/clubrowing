import { mapToBoatDto } from "@/domain/boats/common/map-to-boat-dto";
import type { Context } from "@/domain/common/context";
import type { GetBoatByIdInput } from "@/schemas";

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
