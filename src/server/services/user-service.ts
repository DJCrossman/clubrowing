import {
	clerkClient,
	type OrganizationMembership,
	type User,
} from "@clerk/nextjs/server";
import { getDefaultOrganizationId } from "@/server/clerk/default-organization";

export type UserService = {
	getUser: (userId: string) => Promise<User>;
	getUsers: (userIds: string[]) => Promise<User[]>;
	getOrganizationMemberships: () => Promise<OrganizationMembership[]>;
};

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
	};
}
