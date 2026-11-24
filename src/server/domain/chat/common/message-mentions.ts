import type { ViewerContext } from "@/domain/common/context";
import type { MentionRange } from "@/lib/chat/mentions";
import type { AccessibleChannel } from "./chat-access";
import { listChannelChatUsers } from "./chat-users";

export async function selectChannelMentions({
	db,
	services,
	channel,
	authorUserId,
	mentions,
}: Pick<ViewerContext, "db" | "services"> & {
	channel: AccessibleChannel;
	authorUserId: string;
	mentions: MentionRange[];
}): Promise<MentionRange[]> {
	if (mentions.length === 0) return [];
	const readers = await listChannelChatUsers({
		db,
		services,
		channel,
		excludeUserId: authorUserId,
	});
	return mentions.filter((mention) =>
		readers.some((reader) => reader.id === mention.userId),
	);
}
