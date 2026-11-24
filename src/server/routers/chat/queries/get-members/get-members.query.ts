import { paginate } from "@/lib/pagination";
import type { GetMembersInput } from "@/schemas/chat.schema";
import type { ViewerContext } from "@/server/domain/common/context";
import { findAccessibleChannel } from "@/server/routers/chat/common/chat-access";
import {
	listChannelChatUsers,
	listChatUsers,
} from "@/server/routers/chat/common/chat-users";

export async function getMembersQuery(
	input: GetMembersInput,
	{ db, user }: ViewerContext,
) {
	if (!input?.channelId) {
		const data = await listChatUsers(db, user.id);
		return paginate({ data, totalCount: data.length });
	}
	const data = await listChannelChatUsers({
		db,
		channel: await findAccessibleChannel(db, input.channelId, user),
		excludeUserId: user.id,
	});
	return paginate({ data, totalCount: data.length });
}
