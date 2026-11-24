import { mapToAthleteDto } from "@/domain/athletes/common/map-to-athlete-dto";
import type { OnboardingContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { CompleteOnboarding } from "@/schemas";

export async function completeOnboardingCommand(
	input: CompleteOnboarding,
	{ db, user, services }: OnboardingContext,
) {
	const clerkUser = await services.userService.getUser(user.id);
	const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;

	if (email) {
		const existingByEmail = await db.athlete.findUnique({ where: { email } });
		if (existingByEmail) {
			throw new DomainError(
				"CONFLICT",
				"An athlete with your email already exists; please contact a club admin to link it.",
			);
		}
	}

	const athlete = await db.athlete.create({
		data: {
			userId: user.id,
			firstName: input.firstName,
			lastName: input.lastName,
			nickname: input.nickname,
			email,
			phone: input.phone,
			gender: input.gender,
			dateOfBirth: new Date(input.dateOfBirth),
			heightInCm: input.heightInCm ?? null,
			weightInKg: input.weightInKg ?? null,
			dateJoined: new Date(),
			role: user.isAdmin ? "admin" : "member",
		},
		include: { memberships: { include: { program: true } } },
	});

	return mapToAthleteDto(athlete);
}
