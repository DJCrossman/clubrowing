import type { GetThreadInput } from "@/schemas/chat.schema";
import { findAccessibleMessage } from "@/server/domain/chat/common/chat-access";
import { loadMessageDtos } from "@/server/domain/chat/common/load-message-dtos";
import { messageInclude } from "@/server/domain/chat/common/map-to-message-dto";
import type { ViewerContext } from "@/server/domain/common/context";

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
