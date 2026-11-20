import { after } from "next/server";
import type { ChannelKind, message } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";
import {
	channelNotificationScope,
	type PushMessage,
} from "@/lib/notifications";
import { routes } from "@/lib/routes";
import type { ViewerContext } from "@/server/context";
import { getGroupMemberIds } from "@/server/routers/groups/common";
import { canAccessChannel } from "./chat-access";
import { getChatUser } from "./chat-user-names";
import { loadChatUsers } from "./chat-users";
import { getChannelName, getMessagePreview } from "./map-to-channel-dto";

const logger = createLogger("chat.notify");

type NotifiableMessage = Pick<
	message,
	"channelId" | "authorUserId" | "parentId" | "text" | "gif" | "forwardedFromId"
> & { attachments?: { name: string | null }[] };

type NotifiableChannel = {
	kind: ChannelKind;
	groupId: string | null;
	members: { userId: string }[];
};

type LinkedAthlete = { id: string; userId: string | null; role: string };

// Pushes go out once the response is flushed, so sending a message never waits
// on them and a delivery failure can't undo a message that was already saved.
export function notifyChannelAfterResponse(
	{ db, services }: Pick<ViewerContext, "db" | "services">,
	message: NotifiableMessage,
) {
	after(async () => {
		try {
			const channel = await db.channel.findUnique({
				where: { id: message.channelId },
				include: { members: { select: { userId: true } } },
			});
			if (!channel) return;
			const [athletes, groupMemberIds, group, users, thread] =
				await Promise.all([
					db.athlete.findMany({
						where: { userId: { not: null } },
						select: { id: true, userId: true, role: true },
					}),
					channel.groupId ? getGroupMemberIds(db, channel.groupId) : [],
					channel.groupId
						? db.group.findUnique({
								where: { id: channel.groupId },
								select: { name: true },
							})
						: null,
					loadChatUsers(db, [message.authorUserId]),
					message.parentId
						? db.message.findMany({
								where: {
									OR: [
										{ id: message.parentId },
										{ parentId: message.parentId },
									],
								},
								select: { authorUserId: true },
							})
						: null,
				]);
			await services.push.sendPush(
				selectMessageRecipients(
					channel,
					athletes,
					groupMemberIds,
					message.authorUserId,
					thread?.map((reply) => reply.authorUserId),
				),
				buildMessageNotification(
					message,
					getChatUser(users, message.authorUserId).name,
					channel.kind === "direct_message"
						? null
						: (group?.name ?? getChannelName(channel)),
				),
			);
		} catch (error) {
			logger.error("chat message push failed", {
				channelId: message.channelId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});
}

export function selectMessageRecipients(
	channel: NotifiableChannel,
	athletes: LinkedAthlete[],
	groupMemberIds: string[],
	authorUserId: string,
	threadUserIds?: string[],
): string[] {
	return athletes
		.filter(
			(athlete) =>
				athlete.userId !== null &&
				athlete.userId !== authorUserId &&
				(!threadUserIds || threadUserIds.includes(athlete.userId)) &&
				canAccessChannel(channel, {
					userId: athlete.userId,
					isAdmin: athlete.role === "admin",
					groupIds: new Set(
						channel.groupId && groupMemberIds.includes(athlete.id)
							? [channel.groupId]
							: [],
					),
				}),
		)
		.map((athlete) => athlete.id);
}

export function buildMessageNotification(
	message: NotifiableMessage,
	authorName: string,
	channelName: string | null,
): PushMessage {
	return {
		title: channelName ? `${authorName} in ${channelName}` : authorName,
		body: getMessagePreview({
			...message,
			photoCount:
				message.attachments?.filter(({ name }) => name === null).length ?? 0,
			fileCount:
				message.attachments?.filter(({ name }) => name !== null).length ?? 0,
			fileName:
				message.attachments?.find(({ name }) => name !== null)?.name ?? null,
		}),
		url: message.parentId
			? routes.chat.thread(message.channelId, message.parentId)
			: routes.chat.channel(message.channelId),
		// A burst of messages in one channel replaces itself on the device
		// instead of stacking up.
		tag: `chat-${message.channelId}`,
		scope: channelNotificationScope(message.channelId),
	};
}
