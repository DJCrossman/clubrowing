import type { ReplyInThread } from "@/schemas/chat.schema";
import { findAccessibleMessage } from "@/server/domain/chat/common/chat-access";
import { loadMessageDtos } from "@/server/domain/chat/common/load-message-dtos";
import { messageInclude } from "@/server/domain/chat/common/map-to-message-dto";
import { selectChannelMentions } from "@/server/domain/chat/common/message-mentions";
import { notifyChannelAfterResponse } from "@/server/domain/chat/common/message-notifications";
import type { ViewerContext } from "@/server/domain/common/context";

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
		gif: input.gif?.title ?? null,
		gifId: input.gif?.id ?? null,
		mentions: {
			create: await selectChannelMentions({
				db,
				channel: target.channel,
				authorUserId: user.id,
				mentions: input.mentions ?? [],
			}),
		},
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
					include: { mentions: { select: { userId: true } } },
				})
			: reply,
	);
	const [dto] = await loadMessageDtos(ctx, [reply]);
	return dto;
}
