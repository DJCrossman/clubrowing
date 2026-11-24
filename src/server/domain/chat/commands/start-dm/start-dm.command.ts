import { findExactDm } from "@/domain/chat/common/chat-access";
import { assertKnownChatUsers } from "@/domain/chat/common/chat-users";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { StartDm } from "@/schemas/chat.schema";

export async function startDmCommand(
	input: StartDm,
	{ db, user, services }: ViewerContext,
) {
	if (input.userIds.includes(user.id)) {
		throw new DomainError(
			"BAD_REQUEST",
			"You're already part of the conversation",
		);
	}
	await assertKnownChatUsers({ db, services }, input.userIds);
	const memberIds = [user.id, ...input.userIds];
	const candidates = await db.channel.findMany({
		where: {
			kind: "direct_message",
			AND: memberIds.map((id) => ({ members: { some: { userId: id } } })),
		},
		select: { id: true, members: { select: { userId: true } } },
	});
	const existing = findExactDm(candidates, memberIds);
	if (existing) {
		return { channelId: existing.id };
	}
	const channel = await db.channel.create({
		data: {
			kind: "direct_message",
			members: {
				create: memberIds.map((id) => ({ userId: id, addedByUserId: user.id })),
			},
		},
		select: { id: true },
	});
	return { channelId: channel.id };
}
