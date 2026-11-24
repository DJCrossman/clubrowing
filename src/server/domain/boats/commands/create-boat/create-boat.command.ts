import type { CreateBoat } from "@/schemas";
import {
	convertWeightToKg,
	mapToBoatDto,
} from "@/server/domain/boats/common/map-to-boat-dto";
import type { Context } from "@/server/domain/common/context";

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
