import {
	findAccessibleChannel,
	findAccessibleMessage,
} from "@/domain/chat/common/chat-access";
import { resolveForwardSourceId } from "@/domain/chat/common/map-to-message-dto";
import { notifyChannelAfterResponse } from "@/domain/chat/common/message-notifications";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { ForwardMessage } from "@/schemas/chat.schema";

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
