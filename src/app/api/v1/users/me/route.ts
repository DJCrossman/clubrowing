import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createServerCaller } from "@/server/caller";
import { ensureDefaultOrganizationMembership } from "@/server/clerk/default-organization";

export async function GET() {
	try {
		const session = await auth();

		if (!session.userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		await ensureDefaultOrganizationMembership(session.userId);

		const caller = await createServerCaller();
		const client = await clerkClient();
		const [result, organization] = await Promise.all([
			caller.users.getCurrentUser(),
			session.orgId
				? client.organizations.getOrganization({
						organizationId: session.orgId,
					})
				: null,
		]);

		return NextResponse.json({
			...result,
			organization: organization && {
				name: organization.name,
				logoUrl: organization.hasImage ? organization.imageUrl : null,
			},
		});
	} catch (error) {
		console.error("User info retrieval error:", error);
		return NextResponse.json(
			{ error: "Failed to retrieve user info" },
			{ status: 500 },
		);
	}
}
