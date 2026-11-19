import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDefaultOrganizationId } from "@/server/clerk/default-organization";

export async function GET(request: Request) {
	const { orgId } = await auth();
	const organization = await (
		await clerkClient()
	).organizations.getOrganization({
		organizationId: orgId ?? getDefaultOrganizationId(),
	});

	return NextResponse.redirect(
		organization.hasImage
			? organization.imageUrl
			: new URL("/favicon.ico", request.url),
		// The icon changes when the member signs in or switches organization.
		{ headers: { "Cache-Control": "private, no-cache" } },
	);
}
