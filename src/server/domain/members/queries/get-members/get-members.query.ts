import { athleteInclude } from "@/domain/athletes/common/map-to-athlete-dto";
import { mapToAthleteWithGroups } from "@/domain/athletes/common/map-to-athlete-with-groups";
import type { Context } from "@/domain/common/context";
import { findGroupRules } from "@/domain/groups/common";
import { paginate } from "@/lib/pagination";
import type { GetMembersInput } from "@/schemas";
import {
	filterMembers,
	mergeMembers,
	sortMembers,
} from "../../common/member-rows";

export async function getMembersQuery(
	input: GetMembersInput,
	{ db, services }: Context,
) {
	const {
		page,
		pageSize = 20,
		sortBy,
		order,
		programIds,
		isActive,
		search,
	} = input;
	const [users, invitations, athletes, rules] = await Promise.all([
		services.userService.listMembers(),
		services.userService.listPendingInvitations(),
		db.athlete.findMany({ include: athleteInclude }),
		findGroupRules(db),
	]);

	const rows = sortMembers(
		filterMembers(
			mergeMembers({
				users,
				invitations,
				athletes: athletes.map((row) => mapToAthleteWithGroups(row, rules)),
			}),
			{ search, programIds, isActive },
		),
		{ sortBy, order },
	);
	const start = ((page ?? 1) - 1) * pageSize;

	return paginate({
		data: rows.slice(start, start + pageSize),
		totalCount: rows.length,
		page,
		pageSize,
	});
}
