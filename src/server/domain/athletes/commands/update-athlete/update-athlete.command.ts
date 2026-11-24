import {
	athleteInclude,
	mapToAthleteDto,
} from "@/domain/athletes/common/map-to-athlete-dto";
import type { Context } from "@/domain/common/context";
import type { UpdateAthlete } from "@/schemas/athlete.schema";

export async function updateAthleteCommand(
	input: UpdateAthlete,
	{ db }: Context,
) {
	const row = await db.athlete.update({
		where: { id: input.id },
		data: {
			firstName: input.firstName,
			lastName: input.lastName,
			nickname: input.nickname,
			phone: input.phone,
			gender: input.gender,
			dateOfBirth: new Date(input.dateOfBirth),
			dateJoined: input.dateJoined ? new Date(input.dateJoined) : undefined,
			heightInCm: input.heightInCm,
			weightInKg: input.weightInKg,
		},
		include: athleteInclude,
	});
	return mapToAthleteDto(row);
}
