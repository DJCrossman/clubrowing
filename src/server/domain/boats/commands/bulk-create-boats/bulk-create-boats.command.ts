import {
	convertWeightToKg,
	mapToBoatDto,
} from "@/domain/boats/common/map-to-boat-dto";
import type { Context } from "@/domain/common/context";
import type { BulkCreateBoats } from "@/schemas";

export async function bulkCreateBoatsCommand(
	input: BulkCreateBoats,
	{ db }: Context,
) {
	const boats = await db.boat.createManyAndReturn({
		data: input.boats.map((boat) => ({
			name: boat.name,
			manufacturer: boat.manufacturer,
			seats: boat.seats,
			rigging: boat.rigging,
			weightMinKg: convertWeightToKg({
				value: boat.weightRange.min,
				unit: boat.weightRange.unit,
			}),
			weightMaxKg: convertWeightToKg({
				value: boat.weightRange.max,
				unit: boat.weightRange.unit,
			}),
			preferredWeightUnit: boat.weightRange.unit,
		})),
	});
	return boats.map((boat) => mapToBoatDto({ boat, meters: 0 }));
}
