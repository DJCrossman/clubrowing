import { findMyDm } from "@/domain/chat/common/chat-access";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { LeaveDm } from "@/schemas/chat.schema";

const MIN_MEMBERS_TO_LEAVE = 3;

export async function leaveDmCommand(
	input: LeaveDm,
	{ db, user }: ViewerContext,
) {
	const channel = await findMyDm(db, input.channelId, user.id);
	if (channel.members.length < MIN_MEMBERS_TO_LEAVE) {
		throw new DomainError(
			"BAD_REQUEST",
			"You can't leave a conversation between two people",
		);
	}
	await db.$transaction([
		db.channel_member.delete({
			where: { channelId_userId: { channelId: channel.id, userId: user.id } },
		}),
		db.channel_read.deleteMany({
			where: { channelId: channel.id, userId: user.id },
		}),
	]);
	return { channelId: channel.id };
}
