import {
	clerkClient,
	type OrganizationMembership,
	type User,
} from "@clerk/nextjs/server";
import type { InviteRole } from "@/schemas";
import {
	clubMetadataSchema,
	getDefaultOrganizationId,
	isDefaultOrgAdmin,
} from "@/server/clerk/default-organization";

export interface OrganizationMember {
	userId: string;
	isAdmin: boolean;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	joinedAt: string;
}

export interface PendingInvitation {
	id: string;
	email: string;
	role: InviteRole;
	invitedAt: string;
}

export type UserService = {
	getUser: (userId: string) => Promise<User>;
	getUsers: (userIds: string[]) => Promise<User[]>;
	getOrganizationMemberships: () => Promise<OrganizationMembership[]>;
	isAdmin: (userId: string) => Promise<boolean>;
	listMembers: () => Promise<OrganizationMember[]>;
	listPendingInvitations: () => Promise<PendingInvitation[]>;
	inviteMember: (invite: {
		email: string;
		role: InviteRole;
		inviterUserId: string;
		redirectUrl: string;
	}) => Promise<PendingInvitation>;
	revokeInvitation: (revocation: {
		invitationId: string;
		requestingUserId: string;
	}) => Promise<void>;
};

const CACHE_TTL_MS = 60_000;
const PAGE_SIZE = 500;

let membersCache: { value: OrganizationMember[]; expiresAt: number } | null =
	null;
let invitationsCache: { value: PendingInvitation[]; expiresAt: number } | null =
	null;

export function createUserService(): UserService {
	return {
		getUser: async (userId) => {
			const client = await clerkClient();
			return client.users.getUser(userId);
		},
		getUsers: async (userIds) => {
			const client = await clerkClient();
			const { data } = await client.users.getUserList({
				userId: userIds,
				limit: userIds.length,
			});
			return data;
		},
		getOrganizationMemberships: async () => {
			const client = await clerkClient();
			const { data } = await client.organizations.getOrganizationMembershipList(
				{
					organizationId: getDefaultOrganizationId(),
					limit: 100,
				},
			);
			return data;
		},
		isAdmin: isDefaultOrgAdmin,
		listMembers: listOrganizationMembers,
		listPendingInvitations,
		inviteMember: (invite) =>
			inviteOrganizationMember(invite).catch((error) => {
				throw new Error(describeClerkError(error, "could not be invited"));
			}),
		revokeInvitation: (revocation) =>
			revokeOrganizationInvitation(revocation).catch((error) => {
				throw new Error(
					describeClerkError(error, "Could not revoke the invitation"),
				);
			}),
	};
}

async function listOrganizationMembers(): Promise<OrganizationMember[]> {
	if (membersCache && membersCache.expiresAt > Date.now()) {
		return membersCache.value;
	}
	const client = await clerkClient();
	const [memberships, users] = await Promise.all([
		fetchAllPages((offset) =>
			client.organizations.getOrganizationMembershipList({
				organizationId: getDefaultOrganizationId(),
				limit: PAGE_SIZE,
				offset,
			}),
		),
		fetchAllPages((offset) =>
			client.users.getUserList({ limit: PAGE_SIZE, offset }),
		),
	]);
	const organizationMembers = memberships.flatMap((membership) => {
		const user = membership.publicUserData;
		if (!user) return [];
		return [
			{
				userId: user.userId,
				isAdmin: membership.role === "org:admin",
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.identifier.includes("@") ? user.identifier : null,
				joinedAt: new Date(membership.createdAt).toISOString(),
			},
		];
	});
	const organizationMemberIds = new Set(
		organizationMembers.map((member) => member.userId),
	);
	const clubUsers = users.flatMap((user) => {
		const { defaultOrganizationId } = clubMetadataSchema.parse(
			user.publicMetadata,
		);
		if (
			organizationMemberIds.has(user.id) ||
			defaultOrganizationId !== getDefaultOrganizationId()
		) {
			return [];
		}
		return [
			{
				userId: user.id,
				isAdmin: false,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.primaryEmailAddress?.emailAddress ?? null,
				joinedAt: new Date(user.createdAt).toISOString(),
			},
		];
	});
	const value = [...organizationMembers, ...clubUsers];
	membersCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
	return value;
}

async function listPendingInvitations(): Promise<PendingInvitation[]> {
	if (invitationsCache && invitationsCache.expiresAt > Date.now()) {
		return invitationsCache.value;
	}
	const client = await clerkClient();
	const [organizationInvitations, appInvitations] = await Promise.all([
		fetchAllPages((offset) =>
			client.organizations.getOrganizationInvitationList({
				organizationId: getDefaultOrganizationId(),
				status: ["pending"],
				limit: PAGE_SIZE,
				offset,
			}),
		),
		fetchAllPages((offset) =>
			client.invitations.getInvitationList({
				status: "pending",
				limit: PAGE_SIZE,
				offset,
			}),
		),
	]);
	const value = [
		...organizationInvitations.map((invitation) => ({
			id: invitation.id,
			email: invitation.emailAddress,
			role: toInviteRole(invitation.role),
			invitedAt: new Date(invitation.createdAt).toISOString(),
		})),
		...appInvitations.flatMap((invitation): PendingInvitation[] => {
			const { defaultOrganizationId } = clubMetadataSchema.parse(
				invitation.publicMetadata ?? {},
			);
			if (defaultOrganizationId !== getDefaultOrganizationId()) {
				return [];
			}
			return [
				{
					id: invitation.id,
					email: invitation.emailAddress,
					role: "member",
					invitedAt: new Date(invitation.createdAt).toISOString(),
				},
			];
		}),
	];
	invitationsCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
	return value;
}

async function inviteOrganizationMember({
	email,
	role,
	inviterUserId,
	redirectUrl,
}: {
	email: string;
	role: InviteRole;
	inviterUserId: string;
	redirectUrl: string;
}): Promise<PendingInvitation> {
	const client = await clerkClient();
	// Only admins join the organization; a free one holds 20 members.
	if (role === "admin") {
		const invitation = await client.organizations.createOrganizationInvitation({
			organizationId: getDefaultOrganizationId(),
			emailAddress: email,
			role: "org:admin",
			inviterUserId,
			redirectUrl,
		});
		invitationsCache = null;
		return {
			id: invitation.id,
			email: invitation.emailAddress,
			role: toInviteRole(invitation.role),
			invitedAt: new Date(invitation.createdAt).toISOString(),
		};
	}
	const invitation = await client.invitations.createInvitation({
		emailAddress: email,
		redirectUrl,
		publicMetadata: { defaultOrganizationId: getDefaultOrganizationId() },
	});
	invitationsCache = null;
	return {
		id: invitation.id,
		email: invitation.emailAddress,
		role: "member",
		invitedAt: new Date(invitation.createdAt).toISOString(),
	};
}

async function revokeOrganizationInvitation({
	invitationId,
	requestingUserId,
}: {
	invitationId: string;
	requestingUserId: string;
}): Promise<void> {
	const client = await clerkClient();
	const organizationInvitations = await fetchAllPages((offset) =>
		client.organizations.getOrganizationInvitationList({
			organizationId: getDefaultOrganizationId(),
			status: ["pending"],
			limit: PAGE_SIZE,
			offset,
		}),
	);
	if (organizationInvitations.some(({ id }) => id === invitationId)) {
		await client.organizations.revokeOrganizationInvitation({
			organizationId: getDefaultOrganizationId(),
			invitationId,
			requestingUserId,
		});
	} else {
		await client.invitations.revokeInvitation(invitationId);
	}
	invitationsCache = null;
}

function describeClerkError(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"errors" in error &&
		Array.isArray(error.errors)
	) {
		const first = error.errors[0];
		if (first?.longMessage || first?.message) {
			return first.longMessage ?? first.message ?? fallback;
		}
	}
	return fallback;
}

function toInviteRole(role: string): InviteRole {
	return role === "org:admin" ? "admin" : "member";
}

async function fetchAllPages<T>(
	fetchPage: (offset: number) => Promise<{ data: T[]; totalCount: number }>,
): Promise<T[]> {
	const items: T[] = [];
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const page = await fetchPage(offset);
		items.push(...page.data);
		if (page.data.length < PAGE_SIZE || items.length >= page.totalCount) {
			return items;
		}
	}
}
