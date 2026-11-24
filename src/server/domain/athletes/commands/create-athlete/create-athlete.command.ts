import {
	athleteInclude,
	mapToAthleteDto,
} from "@/domain/athletes/common/map-to-athlete-dto";
import type { Context } from "@/domain/common/context";
import type { CreateAthlete } from "@/schemas/athlete.schema";

export async function createAthleteCommand(
	input: CreateAthlete,
	{ db }: Context,
) {
	const row = await db.athlete.create({
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
