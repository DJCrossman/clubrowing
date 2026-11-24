import type { AuthenticatedContext } from "@/domain/common/context";
import { mapToUserDto } from "@/domain/users/common/map-to-user-dto";
import type { AthleteProfile } from "@/schemas";

export async function updateUserProfileCommand(
	input: AthleteProfile,
	{ db, athlete }: AuthenticatedContext,
) {
	const updated = await db.athlete.update({
		where: { id: athlete.id },
		data: {
			firstName: input.firstName,
			lastName: input.lastName,
			nickname: input.nickname,
			phone: input.phone,
			email: input.email,
			gender: input.gender,
			dateOfBirth: new Date(input.dateOfBirth),
			dateJoined: input.dateJoined ? new Date(input.dateJoined) : undefined,
			heightInCm: input.heightInCm,
			weightInKg: input.weightInKg,
		},
	});
	return mapToUserDto(updated);
}
