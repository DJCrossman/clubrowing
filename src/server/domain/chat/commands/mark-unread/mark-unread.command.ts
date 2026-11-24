import { findAccessibleMessage } from "@/domain/chat/common/chat-access";
import { readMarkerBefore } from "@/domain/chat/common/unread";
import type { ViewerContext } from "@/domain/common/context";
import type { MarkUnread } from "@/schemas/chat.schema";

export async function markUnreadCommand(
	input: MarkUnread,
	{ db, user }: ViewerContext,
) {
	const message = await findAccessibleMessage(db, input.messageId, user);
	const lastReadAt = readMarkerBefore((message.parent ?? message).createdAt);
	await db.channel_read.upsert({
		where: {
			channelId_userId: { channelId: message.channelId, userId: user.id },
		},
		create: { channelId: message.channelId, userId: user.id, lastReadAt },
		update: { lastReadAt },
	});
	return {
		channelId: message.channelId,
		lastReadAt: lastReadAt.toISOString(),
	};
}
