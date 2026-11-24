import { DomainError } from "@/server/domain/common/domain-error";
import type { GroupsDb } from "./group-members";

export async function findGroupOrThrow(db: GroupsDb, groupId: string) {
	const group = await db.group.findUnique({
		where: { id: groupId },
		select: { id: true },
	});
	if (!group) {
		throw new DomainError("NOT_FOUND", "Group not found");
	}
	return group;
}
