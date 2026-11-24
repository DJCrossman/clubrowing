import { type AddDmMembers, MAX_DM_MEMBERS } from "@/schemas/chat.schema";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { findMyDm } from "@/server/routers/chat/common/chat-access";
import { assertKnownChatUsers } from "@/server/routers/chat/common/chat-users";

export async function addDmMembersCommand(
	input: AddDmMembers,
	{ db, user }: ViewerContext,
) {
	const channel = await findMyDm(db, input.channelId, user.id);
	const current = new Set(channel.members.map((member) => member.userId));
	const newIds = input.userIds.filter((id) => !current.has(id));
	if (current.size + newIds.length > MAX_DM_MEMBERS) {
		throw new DomainError(
			"BAD_REQUEST",
			`A conversation can have at most ${MAX_DM_MEMBERS} people`,
		);
	}
	await assertKnownChatUsers(db, newIds);
	const visibleFrom = input.shareHistory ? null : new Date();
	await db.channel_member.createMany({
		data: newIds.map((id) => ({
			channelId: channel.id,
			userId: id,
			addedByUserId: user.id,
			visibleFrom,
		})),
		skipDuplicates: true,
	});
	return { channelId: channel.id, added: newIds.length };
}
