import type { AuthenticatedContext } from "@/server/domain/common/context";
import { mapToUserDto } from "@/server/domain/users/common/map-to-user-dto";

export async function disconnectConcept2Command(
	_input: undefined,
	{ db, athlete }: AuthenticatedContext,
) {
	const updated = await db.athlete.update({
		where: { id: athlete.id },
		data: {
			concept2UserId: null,
			concept2AccessToken: null,
			concept2RefreshToken: null,
			concept2TokenExpiresAt: null,
			concept2ConnectedAt: null,
		},
	});

	return mapToUserDto(updated);
}
