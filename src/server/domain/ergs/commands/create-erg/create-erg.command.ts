import type { Context } from "@/domain/common/context";
import { ergInclude, mapToErgDto } from "@/domain/ergs/common/map-to-erg-dto";
import type { CreateErg } from "@/schemas";

export async function createErgCommand(input: CreateErg, { db }: Context) {
	const erg = await db.erg.create({
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
	return mapToErgDto({ erg, meters: 0 });
}
