import type { ForwardMessage } from "@/schemas/chat.schema";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import {
	findAccessibleChannel,
	findAccessibleMessage,
} from "@/server/routers/chat/common/chat-access";
import { resolveForwardSourceId } from "@/server/routers/chat/common/map-to-message-dto";
import { notifyChannelAfterResponse } from "@/server/routers/chat/common/message-notifications";

export async function forwardMessageCommand(
	input: ForwardMessage,
	{ db, user, services }: ViewerContext,
) {
	const [source, target] = await Promise.all([
		findAccessibleMessage(db, input.messageId, user),
		findAccessibleChannel(db, input.targetChannelId, user),
	]);
	if (source.deletedAt) {
		throw new DomainError("BAD_REQUEST", "This message was deleted");
	}
	const message = await db.message.create({
		data: {
			channelId: target.id,
			authorUserId: user.id,
			text: input.note || null,
			forwardedFromId: resolveForwardSourceId(source),
		},
	});
	notifyChannelAfterResponse({ db, services }, message);
	return { messageId: message.id, channelId: message.channelId };
}
