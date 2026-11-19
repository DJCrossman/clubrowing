import type { Prisma } from "@/generated/prisma/client";

export const ergInclude = { owner: true } as const;

export const mapToErgDto = ({
	erg,
	meters,
}: {
	erg: Prisma.ergGetPayload<{ include: typeof ergInclude }>;
	meters: number;
}) => ({
	id: erg.id,
	name: erg.name,
	manufacturer: erg.manufacturer as "concept2",
	firmwareVersion: erg.firmwareVersion,
	hardwareVersion: erg.hardwareVersion,
	serialNumber: erg.serialNumber,
	dataCode: erg.dataCode,
	ownership: erg.ownership,
	owner: erg.owner
		? { id: erg.owner.id, name: erg.owner.nickname || erg.owner.firstName }
		: null,
	meters,
});
