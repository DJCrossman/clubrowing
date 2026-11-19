import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { orgId } = await auth();
	const organization = orgId
		? await (await clerkClient()).organizations.getOrganization({
				organizationId: orgId,
			})
		: null;

	return NextResponse.redirect(
		organization?.hasImage
			? organization.imageUrl
			: new URL("/favicon.ico", request.url),
		// The icon changes when the member signs in or switches organization.
		{ headers: { "Cache-Control": "private, no-cache" } },
	);
}
