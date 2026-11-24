import type { CreateErg } from "@/schemas";
import type { Context } from "@/server/domain/common/context";
import {
	ergInclude,
	mapToErgDto,
} from "@/server/domain/ergs/common/map-to-erg-dto";

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
