import { createLogger } from "@/lib/logger";
import type { ConnectConcept2Input } from "@/schemas";
import type { AuthenticatedContext } from "@/server/domain/common/context";
import { mapToUserDto } from "@/server/domain/users/common/map-to-user-dto";
import { encryptToken } from "@/server/integration-token-crypto";

const logger = createLogger("concept2.connect");

export async function connectConcept2Command(
	input: ConnectConcept2Input,
	{ db, athlete }: AuthenticatedContext,
) {
	const { tokens, concept2UserId } = input;
	const updated = await db.athlete.update({
		where: { id: athlete.id },
		data: {
			concept2UserId,
			concept2AccessToken: encryptToken(tokens.access_token),
			concept2RefreshToken: encryptToken(tokens.refresh_token),
			concept2TokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
			concept2ConnectedAt: new Date(),
		},
	});
	logger.info("connection saved", { athleteId: athlete.id });

	return mapToUserDto(updated);
}
