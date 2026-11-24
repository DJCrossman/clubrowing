import {
	convertWeightToKg,
	mapToBoatDto,
} from "@/domain/boats/common/map-to-boat-dto";
import type { Context } from "@/domain/common/context";
import type { CreateBoat } from "@/schemas";

export async function createBoatCommand(input: CreateBoat, { db }: Context) {
	const boat = await db.boat.create({
		data: {
			name: input.name,
			manufacturer: input.manufacturer,
			seats: input.seats,
			rigging: input.rigging,
			weightMinKg: convertWeightToKg({
				value: input.weightRange.min,
				unit: input.weightRange.unit,
			}),
			weightMaxKg: convertWeightToKg({
				value: input.weightRange.max,
				unit: input.weightRange.unit,
			}),
			preferredWeightUnit: input.weightRange.unit,
		},
	});
	return mapToBoatDto({ boat, meters: 0 });
}
