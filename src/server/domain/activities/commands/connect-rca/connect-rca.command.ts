import type { AuthenticatedContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import { mapToUserDto } from "@/domain/users/common/map-to-user-dto";
import { createLogger } from "@/lib/logger";
import type { ConnectRcaInput } from "@/schemas";
import { encryptToken } from "@/server/integration-token-crypto";

const logger = createLogger("rca.connect");

export async function connectRcaCommand(
	input: ConnectRcaInput,
	{ db, services, athlete }: AuthenticatedContext,
) {
	const result = await services.rca.login(input);
	if (!result.ok) {
		logger.warn("RCA login rejected", { reason: result.reason });
		throw new DomainError(
			result.reason === "invalid_credentials" ? "UNAUTHORIZED" : "BAD_GATEWAY",
			result.reason,
		);
	}

	const updated = await db.athlete.update({
		where: { id: athlete.id },
		data: {
			rcaUsername: encryptToken(input.username),
			rcaPassword: encryptToken(input.password),
			rcaConnectedAt: new Date(),
		},
	});
	logger.info("connection saved", { athleteId: athlete.id });

	return mapToUserDto(updated);
}
