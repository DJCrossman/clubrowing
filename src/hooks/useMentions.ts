"use client";

import { useState } from "react";
import { trpcClient } from "@/lib/trpc/client";
import type { ChatThread } from "@/lib/trpc/types";

export function useMentions({
	channelId,
	thread,
	isUnavailable,
}: {
	channelId: string;
	thread: ChatThread | undefined;
	isUnavailable: boolean;
}) {
	const [mentioningChannelId, setMentioningChannelId] = useState<string | null>(
		null,
	);
	const [mentioningThreadId, setMentioningThreadId] = useState<string | null>(
		null,
	);
	// A composer that goes away without a blur, as when Escape closes the
	// thread drawer, can't report that its mention ended.
	if (
		mentioningChannelId &&
		(mentioningChannelId !== channelId || isUnavailable)
	) {
		setMentioningChannelId(null);
	}
	if (mentioningThreadId && mentioningThreadId !== thread?.root.id) {
		setMentioningThreadId(null);
	}
	const channelMembersQuery = trpcClient.chat.getMembers.useQuery(
		{ channelId },
		{ enabled: mentioningChannelId === channelId },
	);
	const threadMembersQuery = trpcClient.chat.getMembers.useQuery(
		{ channelId: thread?.root.channelId ?? channelId },
		{ enabled: mentioningThreadId === thread?.root.id },
	);

	return {
		channelMembers: channelMembersQuery.data?.data ?? [],
		threadMembers: threadMembersQuery.data?.data ?? [],
		setIsChannelMentioning: (isMentioning: boolean) =>
			setMentioningChannelId(isMentioning ? channelId : null),
		setIsThreadMentioning: (isMentioning: boolean) =>
			setMentioningThreadId(isMentioning ? (thread?.root.id ?? null) : null),
	};
}
