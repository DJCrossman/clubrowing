import { findAccessibleMessage } from "@/domain/chat/common/chat-access";
import { loadMessageDtos } from "@/domain/chat/common/load-message-dtos";
import { messageInclude } from "@/domain/chat/common/map-to-message-dto";
import type { ViewerContext } from "@/domain/common/context";
import type { GetThreadInput } from "@/schemas/chat.schema";

export async function getThreadQuery(
	input: GetThreadInput,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const message = await findAccessibleMessage(db, input.messageId, user);
	const rootId = message.parentId ?? message.id;
	const [root, replies] = await Promise.all([
		db.message.findUniqueOrThrow({
			where: { id: rootId },
			include: messageInclude,
		}),
		db.message.findMany({
			where: { parentId: rootId, deletedAt: null },
			include: messageInclude,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		}),
	]);
	const [rootDto, ...replyDtos] = await loadMessageDtos(ctx, [
		root,
		...replies,
	]);

	return { channelId: root.channelId, root: rootDto, replies: replyDtos };
}
