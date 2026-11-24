import type { AuthenticatedContext } from "@/domain/common/context";
import { mapToUserDto } from "@/domain/users/common/map-to-user-dto";
import { Prisma } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";

const logger = createLogger("strava.disconnect");

export async function disconnectStravaCommand(
	_input: undefined,
	{ db, athlete }: AuthenticatedContext,
) {
	const updated = await db.athlete.update({
		where: { id: athlete.id },
		data: {
			stravaAthleteId: null,
			stravaAccessToken: null,
			stravaRefreshToken: null,
			stravaTokenExpiresAt: null,
			stravaAthleteJson: Prisma.JsonNull,
			stravaConnectedAt: null,
		},
	});
	logger.info("disconnected — cleared Strava columns", {
		athleteId: athlete.id,
	});

	return mapToUserDto(updated);
}
