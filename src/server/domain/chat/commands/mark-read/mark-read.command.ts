import { findAccessibleChannel } from "@/domain/chat/common/chat-access";
import type { ViewerContext } from "@/domain/common/context";
import type { MarkRead } from "@/schemas/chat.schema";

export async function markReadCommand(
	input: MarkRead,
	{ db, user }: ViewerContext,
) {
	const [channel, latest] = await Promise.all([
		findAccessibleChannel(db, input.channelId, user),
		db.message.findFirst({
			where: { channelId: input.channelId, parentId: null },
			orderBy: { createdAt: "desc" },
			select: { createdAt: true },
		}),
	]);
	const now = new Date();
	const lastReadAt = latest && latest.createdAt > now ? latest.createdAt : now;
	await db.channel_read.upsert({
		where: { channelId_userId: { channelId: channel.id, userId: user.id } },
		create: { channelId: channel.id, userId: user.id, lastReadAt },
		update: { lastReadAt },
	});
	return { channelId: channel.id, lastReadAt: lastReadAt.toISOString() };
}
