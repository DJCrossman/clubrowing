"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useDebounce } from "@/components/ui/multi-select";
import { useCurrentUser } from "@/hooks/useAuth";
import { isOldEnoughForGifs } from "@/lib/chat/gifs";
import { envVars } from "@/lib/env";
import { gifPause, requestGiphy } from "@/lib/giphy";

export function useGifSearch({
	query,
	isEnabled,
}: {
	query: string;
	isEnabled: boolean;
}) {
	const { user } = useCurrentUser();
	const areGifsPaused = useSyncExternalStore(
		gifPause.subscribe,
		gifPause.isPaused,
		() => false,
	);
	const canUseGifs =
		!!envVars.NEXT_PUBLIC_GIPHY_API_KEY && isOldEnoughForGifs(user.dateOfBirth);
	const q = useDebounce(query, 350).trim().slice(0, 50);
	const searchQuery = useQuery({
		queryKey: ["giphy", "search", q],
		queryFn: () =>
			q
				? requestGiphy({ path: "/search", params: { q, limit: "16" } })
				: requestGiphy({ path: "/trending", params: { limit: "16" } }),
		enabled: isEnabled && canUseGifs && !areGifsPaused,
		staleTime: 5 * 60 * 1000,
		retry: false,
	});

	return {
		canUseGifs,
		areGifsPaused,
		gifs: searchQuery.data,
		isLoading: searchQuery.isPending,
		hasFailed: searchQuery.isError || areGifsPaused,
	};
}
