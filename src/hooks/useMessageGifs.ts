"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { isOldEnoughForGifs } from "@/lib/chat/gifs";
import { envVars } from "@/lib/env";
import { type Gif, gifPause, loadGifInBatch } from "@/lib/giphy";

export function useMessageGifs({ gifIds }: { gifIds: string[] }) {
	const { user } = useCurrentUser();
	const queryClient = useQueryClient();
	const areGifsPaused = useSyncExternalStore(
		gifPause.subscribe,
		gifPause.isPaused,
		() => false,
	);
	const canUseGifs =
		!!envVars.NEXT_PUBLIC_GIPHY_API_KEY && isOldEnoughForGifs(user.dateOfBirth);
	const ids = [...new Set(gifIds)];
	const gifQueries = useQueries({
		queries: ids.map((id) => ({
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
			messageGifs.set(ids[index], null);
		} else if (data) {
			messageGifs.set(ids[index], data);
		}
	}

	return {
		messageGifs,
		// The sender already holds the GIF they picked, so their own message needs no request.
		rememberGif: (gif: Gif) =>
			queryClient.setQueryData(["giphy", "gif", gif.id], gif),
	};
}
