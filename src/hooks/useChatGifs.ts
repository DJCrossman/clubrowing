"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import { useDebounce } from "@/components/ui/multi-select";
import { useCurrentUser } from "@/hooks/useAuth";
import { isOldEnoughForGifs } from "@/lib/chat/gifs";
import { envVars } from "@/lib/env";
import { type Gif, gifPause, loadGifInBatch, requestGiphy } from "@/lib/giphy";
import type { ChatMessage, ChatThread } from "@/lib/trpc/types";

export function useChatGifs({
	channelId,
	messages,
	thread,
	isUnavailable,
}: {
	channelId: string;
	messages: ChatMessage[];
	thread: ChatThread | undefined;
	isUnavailable: boolean;
}) {
	const { user } = useCurrentUser();
	const queryClient = useQueryClient();
	const areGifsPaused = useSyncExternalStore(
		gifPause.subscribe,
		gifPause.isPaused,
		() => false,
	);
	const canUseGifs =
		!!envVars.NEXT_PUBLIC_GIPHY_API_KEY && isOldEnoughForGifs(user.dateOfBirth);
	const [openChannelPicker, setOpenChannelPicker] = useState<{
		channelId: string;
		search: string;
	} | null>(null);
	const [openThreadPicker, setOpenThreadPicker] = useState<{
		threadId: string;
		search: string;
	} | null>(null);
	// A GIF picker that goes away while open, as on back and forward, comes back closed.
	if (
		openChannelPicker &&
		(openChannelPicker.channelId !== channelId || isUnavailable)
	) {
		setOpenChannelPicker(null);
	}
	if (openThreadPicker && openThreadPicker.threadId !== thread?.root.id) {
		setOpenThreadPicker(null);
	}
	const channelSearchQuery = useGifSearch({
		query: openChannelPicker?.search ?? "",
		isEnabled: !!openChannelPicker && canUseGifs && !areGifsPaused,
	});
	const threadSearchQuery = useGifSearch({
		query: openThreadPicker?.search ?? "",
		isEnabled: !!openThreadPicker && canUseGifs && !areGifsPaused,
	});
	const shownGifIds = [
		...new Set(
			[
				...messages,
				...(thread ? [thread.root, ...thread.replies] : []),
			].flatMap(({ forwarded, gif, gifId }) => [
				...(forwarded?.gif && forwarded.gifId && !forwarded.deleted
					? [forwarded.gifId]
					: []),
				...(gif && gifId ? [gifId] : []),
			]),
		),
	];
	const gifQueries = useQueries({
		queries: shownGifIds.map((id) => ({
			queryKey: ["giphy", "gif", id],
			queryFn: () => loadGifInBatch(id),
			enabled: canUseGifs && !areGifsPaused,
			// Held in memory for this page only: the provider's terms forbid storing its responses.
			staleTime: Number.POSITIVE_INFINITY,
			gcTime: Number.POSITIVE_INFINITY,
			retry: false,
		})),
	});
	const messageGifs = new Map<string, Gif | null>();
	for (const [index, { data, isError }] of gifQueries.entries()) {
		if (!canUseGifs || areGifsPaused || isError || data === null) {
			messageGifs.set(shownGifIds[index], null);
		} else if (data) {
			messageGifs.set(shownGifIds[index], data);
		}
	}

	return {
		canUseGifs,
		areGifsPaused,
		channelPicker: {
			search: openChannelPicker?.search ?? null,
			gifs: channelSearchQuery.data,
			isLoading: channelSearchQuery.isPending,
			hasFailed: channelSearchQuery.isError || areGifsPaused,
		},
		threadPicker: {
			search: openThreadPicker?.search ?? null,
			gifs: threadSearchQuery.data,
			isLoading: threadSearchQuery.isPending,
			hasFailed: threadSearchQuery.isError || areGifsPaused,
		},
		messageGifs,
		setChannelGifSearch: (search: string | null) =>
			setOpenChannelPicker(search === null ? null : { channelId, search }),
		setThreadGifSearch: (search: string | null) =>
			setOpenThreadPicker(
				search !== null && thread ? { threadId: thread.root.id, search } : null,
			),
		// The sender already holds the GIF they picked, so their own message needs no request.
		rememberGif: (gif: Gif) =>
			queryClient.setQueryData(["giphy", "gif", gif.id], gif),
	};
}

function useGifSearch({
	query,
	isEnabled,
}: {
	query: string;
	isEnabled: boolean;
}) {
	const q = useDebounce(query, 350).trim().slice(0, 50);
	return useQuery({
		queryKey: ["giphy", "search", q],
		queryFn: () =>
			q
				? requestGiphy({ path: "/search", params: { q, limit: "16" } })
				: requestGiphy({ path: "/trending", params: { limit: "16" } }),
		enabled: isEnabled,
		staleTime: 5 * 60 * 1000,
		retry: false,
	});
}
