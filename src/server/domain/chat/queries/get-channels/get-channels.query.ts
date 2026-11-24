import {
	canAccessChannel,
	ensureEveryoneChannel,
	getChannelViewer,
} from "@/domain/chat/common/chat-access";
import { loadChatUsers } from "@/domain/chat/common/chat-users";
import {
	channelInclude,
	type LastMessageRow,
	mapToChannelDto,
	sortChannels,
} from "@/domain/chat/common/map-to-channel-dto";
import {
	buildUnreadMessageWhere,
	toUnreadCounts,
} from "@/domain/chat/common/unread";
import type { ViewerContext } from "@/domain/common/context";
import { getMemberIdsByGroup } from "@/domain/groups/common";
import { Prisma } from "@/generated/prisma/client";
import { paginate } from "@/lib/pagination";

type Db = ViewerContext["db"];

export async function getChannelsQuery(
	_input: undefined,
	{ db, user, services }: ViewerContext,
) {
	const [{ channels: allChannels, groups }, viewer, reads, athleteCount] =
		await Promise.all([
			findVisibleChannels(db, user.id),
			getChannelViewer(db, user),
			db.channel_read.findMany({
				where: { userId: user.id },
				select: { channelId: true, lastReadAt: true },
			}),
			db.athlete.count(),
		]);
	const channels = allChannels.filter((channel) =>
		canAccessChannel(channel, viewer),
	);
	const channelIds = channels.map((channel) => channel.id);
	const [unreadGroups, lastMessages, membersByGroup] = await Promise.all([
		db.message.groupBy({
			by: ["channelId"],
			where: buildUnreadMessageWhere({
				userId: user.id,
				channelIds,
				reads,
				visibleFromByChannel: getMyVisibleFrom(channels, user.id),
			}),
			_count: { _all: true },
		}),
		findLastMessages(db, channelIds),
		getMemberIdsByGroup(
			db,
			groups.map((group) => group.id),
		),
	]);
	const groupNames = new Map(groups.map((group) => [group.id, group.name]));
	const users = await loadChatUsers({ db, services }, [
		...channels.flatMap((channel) =>
			channel.members.map((member) => member.userId),
		),
		...lastMessages.map((message) => message.authorUserId),
	]);
	const unreadCounts = toUnreadCounts(channelIds, unreadGroups);
	const lastMessageByChannel = new Map(
		lastMessages.map((message) => [message.channelId, message]),
	);

	const data = sortChannels(
		channels.map((channel) =>
			mapToChannelDto(channel, {
				userId: user.id,
				users,
				memberCount: channel.groupId
					? (membersByGroup.get(channel.groupId)?.length ?? 0)
					: athleteCount,
				unreadCount: unreadCounts.get(channel.id) ?? 0,
				lastMessage: lastMessageByChannel.get(channel.id) ?? null,
				groupNames,
			}),
		),
	);
	return paginate({ data, totalCount: data.length });
}

async function findVisibleChannels(db: Db, userId: string) {
	const where = {
		OR: [
			{ kind: { in: ["everyone", "group"] } },
			{ kind: "direct_message", members: { some: { userId } } },
		],
	} satisfies Prisma.channelWhereInput;
	const [channels, groups] = await Promise.all([
		db.channel.findMany({ where, include: channelInclude }),
		db.group.findMany({ select: { id: true, name: true } }),
	]);
	const groupIds = new Set(groups.map((group) => group.id));
	const missingGroupIds = [...groupIds].filter(
		(groupId) => !channels.some((channel) => channel.groupId === groupId),
	);
	const hasEveryone = channels.some((channel) => channel.kind === "everyone");
	if (hasEveryone && missingGroupIds.length === 0) {
		return { channels: withoutOrphans(channels, groupIds), groups };
	}
	if (!hasEveryone) {
		await ensureEveryoneChannel(db);
	}
	if (missingGroupIds.length > 0) {
		await db.channel.createMany({
			data: missingGroupIds.map((groupId) => ({ kind: "group", groupId })),
			skipDuplicates: true,
		});
	}
	const refreshed = await db.channel.findMany({
		where,
		include: channelInclude,
	});
	return { channels: withoutOrphans(refreshed, groupIds), groups };
}

// Hides channels left behind by groups deleted before deleting a group also
// removed its channel.
function withoutOrphans<T extends { kind: string; groupId: string | null }>(
	channels: T[],
	groupIds: ReadonlySet<string>,
) {
	return channels.filter(
		(channel) =>
			channel.kind !== "group" ||
			(channel.groupId !== null && groupIds.has(channel.groupId)),
	);
}

function getMyVisibleFrom(
	channels: Awaited<ReturnType<typeof findVisibleChannels>>["channels"],
	userId: string,
) {
	return new Map(
		channels.flatMap((channel) => {
			const visibleFrom = channel.members.find(
				(member) => member.userId === userId,
			)?.visibleFrom;
			return visibleFrom ? [[channel.id, visibleFrom] as const] : [];
		}),
	);
}

async function findLastMessages(db: Db, channelIds: string[]) {
	if (channelIds.length === 0) return [];
	return db.$queryRaw<LastMessageRow[]>`
		SELECT
			last."channelId", last."authorUserId", last."text", last."gif", last."forwardedFromId", last."createdAt",
			attachments."photoCount", attachments."fileCount", attachments."fileName"
		FROM (
			SELECT DISTINCT ON (m."channelId")
				m."id", m."channelId", m."authorUserId", m."text", m."gif", m."forwardedFromId", m."createdAt"
			FROM "message" m
			WHERE m."channelId" IN (${Prisma.join(channelIds)})
				AND m."parentId" IS NULL
				AND m."deletedAt" IS NULL
			ORDER BY m."channelId", m."createdAt" DESC
		) last
		CROSS JOIN LATERAL (
			SELECT
				(COUNT(*) FILTER (WHERE u."name" IS NULL))::int AS "photoCount",
				(COUNT(*) FILTER (WHERE u."name" IS NOT NULL))::int AS "fileCount",
				(ARRAY_AGG(u."name" ORDER BY u."createdAt") FILTER (WHERE u."name" IS NOT NULL))[1] AS "fileName"
			FROM "upload" u
			WHERE u."messageId" = last."id"
		) attachments
	`;
}
