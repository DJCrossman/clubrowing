#!/usr/bin/env bun

/**
 * Stand-in for the Clerk backend API on a dummy instance, so it never talks to
 * a real Clerk. Serves at CLERK_API_URL with the dummy organization (the e2e
 * admin its only member) and every dummy athlete tied to it by public
 * metadata. Started by docker/dev-entrypoint.sh in the app
 * container; its signing key changes on every start, so it shares the
 * container's lifecycle with `next dev`.
 */

import { clerkPlugin, getClerkStore, seedFromConfig } from "@emulators/clerk";
import { createServer, serve } from "@emulators/core";
import { z } from "zod";
import {
	ATHLETES,
	DUMMY_ORGANIZATION_ID,
	E2E_ADMIN_USER_ID,
} from "./lib/dummy-data";

interface ApplicationInvitation {
	object: "invitation";
	id: string;
	email_address: string;
	public_metadata: Record<string, unknown>;
	revoked: boolean;
	status: "pending" | "revoked";
	url: string;
	expires_at: number;
	created_at: number;
	updated_at: number;
}

const createInvitationBodySchema = z.object({
	email_address: z.string(),
	public_metadata: z.record(z.string(), z.unknown()).default({}),
	expires_in_days: z.number().default(30),
});

const invitations: ApplicationInvitation[] = [];

const apiUrl = process.env.CLERK_API_URL;
if (!apiUrl) {
	console.error("❌ CLERK_API_URL is not set.");
	process.exit(1);
}
const { origin: baseUrl, hostname, port } = new URL(apiUrl);

const { app, store } = createServer(
	{
		...clerkPlugin,
		register(app, store, ...rest) {
			clerkPlugin.register(app, store, ...rest);
			// @clerk/backend's users.getOrganizationMembershipList; the emulator lacks it.
			app.get("/v1/users/:userId/organization_memberships", (c) => {
				const clerk = getClerkStore(store);
				const userId = c.req.param("userId");
				const user = clerk.users.findOneBy("clerk_id", userId);
				const data = clerk.memberships
					.findBy("user_id", userId)
					.map((membership) => {
						const organization = clerk.organizations.findOneBy(
							"clerk_id",
							membership.org_id,
						);
						return {
							id: membership.membership_id,
							object: "organization_membership",
							role: membership.role,
							permissions: membership.permissions,
							public_metadata: membership.public_metadata,
							private_metadata: membership.private_metadata,
							organization: {
								id: organization?.clerk_id,
								object: "organization",
								name: organization?.name,
								slug: organization?.slug,
								image_url: organization?.image_url,
								has_image: false,
								members_count: organization?.members_count,
								public_metadata: organization?.public_metadata,
								created_at: organization?.created_at_unix,
								updated_at: organization?.updated_at_unix,
							},
							public_user_data: {
								user_id: userId,
								first_name: user?.first_name,
								last_name: user?.last_name,
								image_url: user?.image_url,
								has_image: false,
								identifier: userId,
							},
							created_at: membership.created_at_unix,
							updated_at: membership.updated_at_unix,
						};
					});
				return c.json({ data, total_count: data.length });
			});
			// @clerk/backend's application invitations; the emulator only has organization ones.
			app.get("/v1/invitations", (c) => {
				const status = c.req.query("status");
				const offset = Number(c.req.query("offset") ?? 0);
				const limit = Number(c.req.query("limit") ?? 10);
				const matching = invitations.filter(
					(invitation) => !status || invitation.status === status,
				);
				return c.json({
					data: matching.slice(offset, offset + limit),
					total_count: matching.length,
				});
			});
			app.post("/v1/invitations", async (c) => {
				const body = createInvitationBodySchema.parse(await c.req.json());
				const now = Date.now();
				const id = `inv_${crypto.randomUUID().replaceAll("-", "")}`;
				const invitation: ApplicationInvitation = {
					object: "invitation",
					id,
					email_address: body.email_address,
					public_metadata: body.public_metadata,
					revoked: false,
					status: "pending",
					url: `${baseUrl}/v1/tickets/accept?ticket=${id}`,
					expires_at: now + body.expires_in_days * 24 * 60 * 60 * 1000,
					created_at: now,
					updated_at: now,
				};
				invitations.push(invitation);
				return c.json(invitation);
			});
			app.post("/v1/invitations/:invitationId/revoke", (c) => {
				const invitation = invitations.find(
					({ id }) => id === c.req.param("invitationId"),
				);
				if (!invitation) {
					return c.json(
						{
							errors: [
								{
									code: "resource_not_found",
									message: "not found",
									long_message: "Invitation not found",
								},
							],
						},
						404,
					);
				}
				invitation.revoked = true;
				invitation.status = "revoked";
				invitation.updated_at = Date.now();
				return c.json(invitation);
			});
		},
	},
	{
		port: Number(port),
		baseUrl,
		fallbackUser: { login: "dummy", id: 1, scopes: [] },
	},
);
clerkPlugin.seed?.(store, baseUrl);
seedFromConfig(store, baseUrl, {
	users: ATHLETES.map(({ userId, email, firstName, lastName }) => ({
		clerk_id: userId,
		email_addresses: [email],
		first_name: firstName,
		last_name: lastName,
		public_metadata: { defaultOrganizationId: DUMMY_ORGANIZATION_ID },
	})),
	organizations: [
		{
			clerk_id: DUMMY_ORGANIZATION_ID,
			name: "Dummy Rowing Club",
			members: ATHLETES.filter(
				({ userId }) => userId === E2E_ADMIN_USER_ID,
			).map(({ email }) => ({ email, role: "admin" })),
		},
	],
});

serve({
	hostname,
	port: Number(port),
	fetch: async (request) => {
		const response = await app.fetch(request);
		if (!response.headers.get("content-type")?.startsWith("application/json")) {
			return response;
		}
		const url = new URL(request.url);
		if (
			request.method === "GET" &&
			url.pathname === "/v1/users" &&
			response.ok
		) {
			// Real Clerk returns a bare array here and honours user_id; the emulator wraps it in { data } and ignores user_id.
			const userIds = url.searchParams.getAll("user_id");
			const { data } = (await response.json()) as { data: { id: string }[] };
			return new Response(
				JSON.stringify(
					userIds.length ? data.filter(({ id }) => userIds.includes(id)) : data,
				),
				{ headers: { "content-type": "application/json" } },
			);
		}
		// @clerk/backend only parses bodies whose Content-Type is exactly "application/json".
		const headers = new Headers(response.headers);
		headers.set("content-type", "application/json");
		return new Response(response.body, { status: response.status, headers });
	},
});
console.log(`▶ Clerk emulator on ${baseUrl}`);
