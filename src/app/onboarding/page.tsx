import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingScene } from "@/scenes/onboarding";
import { ensureDefaultOrganization } from "@/server/clerk/default-organization";
import { createServerCaller } from "@/trpc/caller";

export default async function OnboardingPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const session = await auth();

	if (!session.userId) {
		redirect("/login");
	}

	await ensureDefaultOrganization(session.userId);

	const { step } = await searchParams;
	const stepParam = Array.isArray(step) ? step[0] : step;

	const client = await clerkClient();
	const clerkUser = await client.users.getUser(session.userId);

	const caller = await createServerCaller();
	const initialUser = await caller.users.getCurrentUser();

	return (
		<OnboardingScene
			step={stepParam}
			defaultFirstName={clerkUser.firstName ?? undefined}
			defaultLastName={clerkUser.lastName ?? undefined}
			initialUser={initialUser}
		/>
	);
}
