import type { Prisma } from "@/generated/prisma/client";
import { type ChatUser, getChatUser } from "./chat-user-names";
import type { LinkPreview } from "./link-previews";
import { getForwardSourceName } from "./map-to-channel-dto";

const MAX_REPLY_AUTHORS = 3;

export const messageInclude = {
	reactions: {
		select: { emoji: true, userId: true },
		orderBy: { createdAt: "asc" },
	},
	quotedMessage: {
		select: {
			id: true,
			text: true,
			gif: true,
			deletedAt: true,
			authorUserId: true,
			attachments: { select: { name: true }, orderBy: { createdAt: "asc" } },
		},
	},
	forwardedFrom: {
		select: {
			id: true,
			text: true,
			gif: true,
			gifId: true,
			deletedAt: true,
			createdAt: true,
			authorUserId: true,
			channel: { select: { kind: true, groupId: true } },
			attachments: { select: { name: true }, orderBy: { createdAt: "asc" } },
		},
	},
	attachments: {
		select: {
			id: true,
			name: true,
			size: true,
			contentType: true,
			durationMs: true,
			width: true,
			height: true,
			preview: { select: { id: true } },
		},
		orderBy: { createdAt: "asc" },
	},
	replies: {
		where: { deletedAt: null },
		select: { createdAt: true, authorUserId: true },
		orderBy: { createdAt: "desc" },
	},
} as const satisfies Prisma.messageInclude;

export type MessageRow = Prisma.messageGetPayload<{
	include: typeof messageInclude;
}>;

type Viewer = { userId: string; isAdmin: boolean };
type Users = Map<string, ChatUser>;

export function collectMessageUserIds(messages: MessageRow[]) {
	return messages.flatMap((message) => [
		message.authorUserId,
		...message.reactions.map((reaction) => reaction.userId),
		...message.replies.map((reply) => reply.authorUserId),
		...(message.quotedMessage ? [message.quotedMessage.authorUserId] : []),
		...(message.forwardedFrom ? [message.forwardedFrom.authorUserId] : []),
	]);
}

export function mapToMessageDto(
	message: MessageRow,
	viewer: Viewer,
	users: Users,
	previews: LinkPreview[] = [],
) {
	const deleted = message.deletedAt !== null;
	const isMine = message.authorUserId === viewer.userId;
	return {
		id: message.id,
		channelId: message.channelId,
		parentId: message.parentId,
		createdAt: message.createdAt.toISOString(),
		editedAt: deleted ? null : (message.editedAt?.toISOString() ?? null),
		author: getChatUser(users, message.authorUserId),
		text: deleted ? null : message.text,
		gif: deleted ? null : message.gif,
		gifId: deleted ? null : message.gifId,
		photos: deleted
			? []
			: message.attachments.flatMap(({ id, name }) =>
					name === null
						? [
								{
									id,
									url: `/api/v1/chat/attachments/${id}`,
									thumbnailUrl: `/api/v1/chat/attachments/${id}?size=thumbnail`,
								},
							]
						: [],
				),
		files: deleted
			? []
			: message.attachments.flatMap(
					({ id, name, size, contentType, preview }) =>
						name === null || contentType !== null
							? []
							: [
									{
										id,
										url: `/api/v1/chat/attachments/${id}`,
										name,
										size,
										previewUrl:
											preview && `/api/v1/chat/attachments/${preview.id}`,
									},
								],
				),
		videos: deleted
			? []
			: message.attachments.flatMap(
					({
						id,
						name,
						size,
						contentType,
						durationMs,
						width,
						height,
						preview,
					}) =>
						name === null || contentType === null
							? []
							: [
									{
										id,
										name,
										size,
										durationMs,
										width,
										height,
										playUrl: `/api/v1/chat/attachments/${id}/play`,
										posterUrl:
											preview && `/api/v1/chat/attachments/${preview.id}`,
									},
								],
				),
		deleted,
		isMine,
		canEdit: !deleted && isMine && message.text !== null,
		canDelete: !deleted && (isMine || viewer.isAdmin),
		reactions: deleted
			? []
			: groupReactions(message.reactions, viewer.userId, users),
		quoted: deleted ? null : mapQuotedMessage(message.quotedMessage, users),
		forwarded: deleted
			? null
			: mapForwardedMessage(message.forwardedFrom, users),
		previews: deleted ? [] : previews,
		...summarizeReplies(message.replies, users),
	};
}

export type MessageDto = ReturnType<typeof mapToMessageDto>;

export function groupReactions(
	reactions: { emoji: string; userId: string }[],
	viewerUserId: string,
	users: Users,
) {
	const groups = new Map<
		string,
		{ emoji: string; count: number; names: string[]; reactedByMe: boolean }
	>();
	for (const { emoji, userId } of reactions) {
		const isMine = userId === viewerUserId;
		const group = groups.get(emoji) ?? {
			emoji,
			count: 0,
			names: [],
			reactedByMe: false,
		};
		group.count += 1;
		group.names.push(isMine ? "You" : getChatUser(users, userId).name);
		group.reactedByMe = group.reactedByMe || isMine;
		groups.set(emoji, group);
	}
	return [...groups.values()];
}

export function mapQuotedMessage(
	quoted: MessageRow["quotedMessage"],
	users: Users,
) {
	if (!quoted) return null;
	const deleted = quoted.deletedAt !== null;
	return {
		id: quoted.id,
		author: getChatUser(users, quoted.authorUserId),
		text: deleted ? null : quoted.text,
		gif: deleted ? null : quoted.gif,
		photoCount: deleted
			? 0
			: quoted.attachments.filter(({ name }) => name === null).length,
		fileCount: deleted
			? 0
			: quoted.attachments.filter(({ name }) => name !== null).length,
		fileName: deleted
			? null
			: (quoted.attachments.find(({ name }) => name !== null)?.name ?? null),
		deleted,
	};
}

export function mapForwardedMessage(
	original: MessageRow["forwardedFrom"],
	users: Users,
) {
	if (!original) return null;
	const deleted = original.deletedAt !== null;
	return {
		id: original.id,
		channelName: getForwardSourceName(original.channel),
		author: getChatUser(users, original.authorUserId),
		text: deleted ? null : original.text,
		gif: deleted ? null : original.gif,
		gifId: deleted ? null : original.gifId,
		photoCount: deleted
			? 0
			: original.attachments.filter(({ name }) => name === null).length,
		fileCount: deleted
			? 0
			: original.attachments.filter(({ name }) => name !== null).length,
		fileName: deleted
			? null
			: (original.attachments.find(({ name }) => name !== null)?.name ?? null),
		createdAt: original.createdAt.toISOString(),
		deleted,
	};
}

export function summarizeReplies(replies: MessageRow["replies"], users: Users) {
	const authorIds: string[] = [];
	for (const { authorUserId } of replies) {
		if (authorIds.length === MAX_REPLY_AUTHORS) break;
		if (!authorIds.includes(authorUserId)) {
			authorIds.push(authorUserId);
		}
	}
	return {
		replyCount: replies.length,
		lastReplyAt: replies[0]?.createdAt.toISOString() ?? null,
		replyAuthors: authorIds.map((id) => getChatUser(users, id)),
	};
}

export function resolveForwardSourceId(message: {
	id: string;
	forwardedFromId: string | null;
}) {
	return message.forwardedFromId ?? message.id;
}
