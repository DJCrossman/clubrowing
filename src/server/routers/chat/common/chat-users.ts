import { clerkClient } from "@clerk/nextjs/server";
import { getDefaultOrganizationId } from "@/server/clerk/default-organization";
import type { ViewerContext } from "@/server/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { getGroupMemberIds } from "@/server/routers/groups/common";
import { type AccessibleChannel, canAccessChannel } from "./chat-access";
import { type ChatUser, toChatUser } from "./chat-user-names";

type Db = ViewerContext["db"];

const CLERK_CACHE_TTL_MS = 5 * 60_000;
const clerkUserCache = new Map<
	string,
	{ user: ChatUser | null; expiresAt: number }
>();
let clerkAdminIdsCache: { ids: string[]; expiresAt: number } | null = null;

export async function loadChatUsers(
	db: Db,
	userIds: Iterable<string>,
): Promise<Map<string, ChatUser>> {
	const ids = [...new Set(userIds)];
	if (ids.length === 0) return new Map();
	const athletes = await db.athlete.findMany({
		where: { userId: { in: ids } },
		select: {
			userId: true,
			firstName: true,
			lastName: true,
			nickname: true,
		},
	});
	const users = new Map<string, ChatUser>();
	for (const athlete of athletes) {
		if (athlete.userId) {
			users.set(athlete.userId, toChatUser(athlete.userId, athlete));
		}
	}
	const missing = ids.filter((id) => !users.has(id));
	for (const [id, user] of await loadClerkUsers(missing)) {
		users.set(id, user);
	}
	return users;
}

export async function listChatUsers(db: Db, excludeUserId: string) {
	const athletes = await db.athlete.findMany({
		where: { userId: { not: null } },
		select: {
			userId: true,
			firstName: true,
			lastName: true,
			nickname: true,
		},
	});
	const users = athletes.flatMap((athlete) =>
		athlete.userId ? [toChatUser(athlete.userId, athlete)] : [],
	);
	const adminIds = (await loadClerkAdminIds()).filter(
		(id) => !users.some((user) => user.id === id),
	);
	const admins = await loadClerkUsers(adminIds);
	return [...users, ...admins.values()]
		.filter((user) => user.id !== excludeUserId)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listChannelChatUsers({
	db,
	channel,
	excludeUserId,
}: {
	db: Db;
	channel: AccessibleChannel;
	excludeUserId: string;
}): Promise<ChatUser[]> {
	const users = await listChatUsers(db, excludeUserId);
	if (channel.kind !== "group") {
		return users.filter((user) =>
			canAccessChannel(channel, {
				userId: user.id,
				isAdmin: false,
				groupIds: new Set(),
			}),
		);
	}
	// After listChatUsers, so its Clerk admin lookup is already cached.
	const [athletes, groupMemberIds, clerkAdminIds] = await Promise.all([
		db.athlete.findMany({
			where: { userId: { not: null } },
			select: { id: true, userId: true, role: true },
		}),
		channel.groupId ? getGroupMemberIds(db, channel.groupId) : ([] as string[]),
		loadClerkAdminIds(),
	]);
	const athleteByUserId = new Map(
		athletes.map((athlete) => [athlete.userId, athlete]),
	);
	return users.filter((user) => {
		const athlete = athleteByUserId.get(user.id);
		return canAccessChannel(channel, {
			userId: user.id,
			isAdmin: athlete?.role === "admin" || clerkAdminIds.includes(user.id),
			groupIds: new Set(
				channel.groupId && athlete && groupMemberIds.includes(athlete.id)
					? [channel.groupId]
					: [],
			),
		});
	});
}

async function loadClerkUsers(userIds: string[]) {
	const users = new Map<string, ChatUser>();
	const now = Date.now();
	const uncached = userIds.filter((id) => {
		const cached = clerkUserCache.get(id);
		if (cached && cached.expiresAt > now) {
			if (cached.user) users.set(id, cached.user);
			return false;
		}
		return true;
	});
	if (uncached.length === 0) return users;
	try {
		const client = await clerkClient();
		const { data } = await client.users.getUserList({
			userId: uncached,
			limit: uncached.length,
		});
		for (const id of uncached) {
			const clerkUser = data.find((candidate) => candidate.id === id);
			const user = clerkUser ? toChatUser(id, clerkUser) : null;
			clerkUserCache.set(id, { user, expiresAt: now + CLERK_CACHE_TTL_MS });
			if (user) users.set(id, user);
		}
	} catch (error) {
		console.error("Failed to load chat users from Clerk:", error);
	}
	return users;
}

async function loadClerkAdminIds() {
	if (clerkAdminIdsCache && clerkAdminIdsCache.expiresAt > Date.now()) {
		return clerkAdminIdsCache.ids;
	}
	try {
		const client = await clerkClient();
		const { data } = await client.organizations.getOrganizationMembershipList({
			organizationId: getDefaultOrganizationId(),
			limit: 100,
		});
		const ids = data.flatMap((membership) =>
			membership.role === "org:admin" && membership.publicUserData?.userId
				? [membership.publicUserData.userId]
				: [],
		);
		clerkAdminIdsCache = { ids, expiresAt: Date.now() + CLERK_CACHE_TTL_MS };
		return ids;
	} catch (error) {
		console.error("Failed to list Clerk admins for chat:", error);
		return [];
	}
}

export async function assertKnownChatUsers(db: Db, userIds: string[]) {
	const users = await loadChatUsers(db, userIds);
	if (userIds.some((id) => !users.has(id))) {
		throw new DomainError(
			"NOT_FOUND",
			"Some of those people couldn't be found",
		);
	}
}
