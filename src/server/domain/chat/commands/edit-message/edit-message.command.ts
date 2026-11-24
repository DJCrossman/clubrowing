import { findAccessibleMessage } from "@/domain/chat/common/chat-access";
import { selectChannelMentions } from "@/domain/chat/common/message-mentions";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { EditMessage } from "@/schemas/chat.schema";

export async function editMessageCommand(
	input: EditMessage,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const message = await findAccessibleMessage(db, input.messageId, user);
	if (message.authorUserId !== user.id) {
		throw new DomainError("FORBIDDEN", "You can only edit your own messages");
	}
	if (message.deletedAt) {
		throw new DomainError("BAD_REQUEST", "This message was deleted");
	}
	if (message.text !== input.text) {
		await db.message.update({
			where: { id: message.id },
			data: {
				text: input.text,
				editedAt: new Date(),
				mentions: {
					deleteMany: {},
					create: await selectChannelMentions({
						db,
						channel: message.channel,
						authorUserId: user.id,
						mentions: input.mentions ?? [],
					}),
				},
			},
		});
	}
	return {
		messageId: message.id,
		channelId: message.channelId,
		parentId: message.parentId,
	};
}
