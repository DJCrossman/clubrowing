import { mapToAthleteWithGroups } from "@/server/domain/athletes/common/map-to-athlete-with-groups";
import type { ViewerContext } from "@/server/domain/common/context";
import { findGroupRules } from "@/server/routers/groups/common";

export async function getCurrentAthleteQuery(
	_input: undefined,
	{ db, athlete }: ViewerContext,
) {
	return athlete
		? mapToAthleteWithGroups(athlete, await findGroupRules(db))
		: null;
}
