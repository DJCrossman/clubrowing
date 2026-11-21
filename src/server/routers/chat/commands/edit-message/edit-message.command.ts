import type { EditMessage } from "@/schemas/chat.schema";
import type { ViewerContext } from "@/server/context";
import { findAccessibleMessage } from "@/server/routers/chat/common/chat-access";
import { selectChannelMentions } from "@/server/routers/chat/common/message-mentions";
import { TRPCError } from "@/server/trpc";

export async function editMessageCommand(
	input: EditMessage,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const message = await findAccessibleMessage(db, input.messageId, user);
	if (message.authorUserId !== user.id) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only edit your own messages",
		});
	}
	if (message.deletedAt) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This message was deleted",
		});
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
