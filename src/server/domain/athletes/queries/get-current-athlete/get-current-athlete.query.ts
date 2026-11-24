import { mapToAthleteWithGroups } from "@/domain/athletes/common/map-to-athlete-with-groups";
import type { ViewerContext } from "@/domain/common/context";
import { findGroupRules } from "@/domain/groups/common";

export async function getCurrentAthleteQuery(
	_input: undefined,
	{ db, athlete }: ViewerContext,
) {
	return athlete
		? mapToAthleteWithGroups(athlete, await findGroupRules(db))
		: null;
}
