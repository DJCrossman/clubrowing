import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureDefaultOrganization } from "@/server/clerk/default-organization";
import { createServerCaller } from "@/server/infra/trpc/caller";

export async function GET() {
	try {
		const session = await auth();

		if (!session.userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const organizationId = await ensureDefaultOrganization(session.userId);

		const caller = await createServerCaller();
		const client = await clerkClient();
		const [result, organization] = await Promise.all([
			caller.users.getCurrentUser(),
			client.organizations.getOrganization({ organizationId }),
		]);

		return NextResponse.json({
			...result,
			organization: {
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
