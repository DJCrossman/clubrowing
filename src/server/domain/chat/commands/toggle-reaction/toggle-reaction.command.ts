import { findAccessibleMessage } from "@/domain/chat/common/chat-access";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { ToggleReaction } from "@/schemas/chat.schema";

export async function toggleReactionCommand(
	input: ToggleReaction,
	{ db, user }: ViewerContext,
) {
	const message = await findAccessibleMessage(db, input.messageId, user);
	if (message.deletedAt) {
		throw new DomainError("BAD_REQUEST", "This message was deleted");
	}
	const reaction = {
		messageId: message.id,
		userId: user.id,
		emoji: input.emoji,
	};
	const { count } = await db.message_reaction.deleteMany({ where: reaction });
	if (count > 0) {
		return { reacted: false };
	}
	await db.message_reaction.createMany({
		data: [reaction],
		skipDuplicates: true,
	});
	return { reacted: true };
}
