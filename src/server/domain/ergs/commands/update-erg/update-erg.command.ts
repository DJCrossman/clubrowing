import type { Context } from "@/domain/common/context";
import { ergInclude, mapToErgDto } from "@/domain/ergs/common/map-to-erg-dto";
import type { UpdateErg } from "@/schemas";

export async function updateErgCommand(input: UpdateErg, { db }: Context) {
	const erg = await db.erg.update({
		where: { id: input.id },
		data: {
			name: input.name,
			manufacturer: input.manufacturer,
			firmwareVersion: input.firmwareVersion,
			hardwareVersion: input.hardwareVersion,
			serialNumber: input.serialNumber,
			dataCode: input.dataCode,
			ownership: input.ownership,
			ownerId: input.ownerId,
		},
		include: ergInclude,
	});

	const agg = await db.activity.aggregate({
		where: { ergId: input.id, type: "erg" },
		_sum: { distance: true },
	});

	return mapToErgDto({ erg, meters: agg._sum.distance ?? 0 });
}
