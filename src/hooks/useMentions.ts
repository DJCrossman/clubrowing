"use client";

import { trpcClient } from "@/lib/trpc/client";

export function useMentions({
	channelId,
	isEnabled,
}: {
	channelId: string;
	isEnabled: boolean;
}) {
	const membersQuery = trpcClient.chat.getMembers.useQuery(
		{ channelId },
		{ enabled: isEnabled },
	);

	return { members: membersQuery.data?.data ?? [] };
}
