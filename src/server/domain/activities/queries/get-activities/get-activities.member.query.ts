import type { ViewerContext } from "@/domain/common/context";
import { resolveActivityAthleteIds } from "./activity-scope";
import {
	type GetActivitiesInput,
	getActivitiesQuery,
} from "./get-activities.query";

export async function getActivitiesMemberQuery(
	input: GetActivitiesInput,
	{ db, user, athlete }: Pick<ViewerContext, "db" | "user" | "athlete">,
) {
	return getActivitiesQuery(
		{
			...input,
			athleteId: undefined,
			athleteIds: resolveActivityAthleteIds({
				isAdmin: user.isAdmin,
				currentAthleteId: athlete?.id ?? null,
				requestedAthleteIds: [
					...(input.athleteId ? [input.athleteId] : []),
					...(input.athleteIds ?? []),
				],
			}),
		},
		{ db, user, athlete },
	);
}
