import type { ForwardMessage } from "@/schemas/chat.schema";
import {
	findAccessibleChannel,
	findAccessibleMessage,
} from "@/server/domain/chat/common/chat-access";
import { resolveForwardSourceId } from "@/server/domain/chat/common/map-to-message-dto";
import { notifyChannelAfterResponse } from "@/server/domain/chat/common/message-notifications";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";

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
