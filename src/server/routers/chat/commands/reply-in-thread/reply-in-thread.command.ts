import type { ReplyInThread } from "@/schemas/chat.schema";
import type { ViewerContext } from "@/server/context";
import { findAccessibleMessage } from "@/server/routers/chat/common/chat-access";
import { loadMessageDtos } from "@/server/routers/chat/common/load-message-dtos";
import { messageInclude } from "@/server/routers/chat/common/map-to-message-dto";
import { notifyChannelAfterResponse } from "@/server/routers/chat/common/message-notifications";

export async function replyInThreadCommand(
	input: ReplyInThread,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const target = await findAccessibleMessage(db, input.messageId, user);
	const rootId = target.parentId ?? target.id;
	const content = {
		channelId: target.channelId,
		authorUserId: user.id,
		text: input.text || null,
		gif: input.gif || null,
	};
	const reply = await db.message.create({
		data: { ...content, parentId: rootId },
		include: messageInclude,
	});
	// The copy in the channel already reaches the thread's people, so they hear
	// about it once.
	notifyChannelAfterResponse(
		ctx,
		input.alsoSendToChannel
			? await db.message.create({
					data: { ...content, quotedMessageId: rootId },
				})
			: reply,
	);
	const [dto] = await loadMessageDtos(ctx, [reply]);
	return dto;
}
