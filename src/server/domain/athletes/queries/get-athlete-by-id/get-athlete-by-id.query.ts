import { athleteInclude } from "@/domain/athletes/common/map-to-athlete-dto";
import { mapToAthleteWithGroups } from "@/domain/athletes/common/map-to-athlete-with-groups";
import type { Context } from "@/domain/common/context";
import { findGroupRules } from "@/domain/groups/common";
import type { GetAthleteByIdInput } from "@/schemas";

export async function getAthleteByIdQuery(
	input: GetAthleteByIdInput,
	{ db }: Context,
) {
	if (!input.id) return null;
	const row = await db.athlete.findUnique({
		where: { id: input.id },
		include: athleteInclude,
	});
	return row ? mapToAthleteWithGroups(row, await findGroupRules(db)) : null;
}
