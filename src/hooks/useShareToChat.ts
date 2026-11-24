"use client";

import { type ChatTarget, getChatTargets } from "@/lib/chat/targets";
import { trpcClient } from "@/lib/trpc/client";

export function useShareToChat({ isEnabled }: { isEnabled: boolean }) {
	const utils = trpcClient.useUtils();
	const channelsQuery = trpcClient.chat.getChannels.useQuery(undefined, {
		enabled: isEnabled,
	});
	const membersQuery = trpcClient.chat.getMembers.useQuery(undefined, {
		enabled: isEnabled,
	});
	const startDm = trpcClient.chat.startDm.useMutation();
	const sendMessage = trpcClient.chat.sendMessage.useMutation();

	return {
		targets: getChatTargets({
			channels: channelsQuery.data?.data ?? [],
			members: membersQuery.data?.data ?? [],
		}),
		isLoadingTargets: channelsQuery.isPending || membersQuery.isPending,
		share: async ({ target, text }: { target: ChatTarget; text: string }) => {
			const channelId =
				"channelId" in target
					? target.channelId
					: (await startDm.mutateAsync({ userIds: [target.userId] })).channelId;
			await sendMessage.mutateAsync({ channelId, text });
			await Promise.all([
				utils.chat.getChannels.invalidate(),
				utils.chat.getMessages.invalidate({ channelId }),
			]);
			return channelId;
		},
	};
}
