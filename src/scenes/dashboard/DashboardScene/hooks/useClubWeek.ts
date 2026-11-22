import { withErrorToast } from "@/lib/toast";
import { trpcClient } from "@/lib/trpc/client";
import type { RsvpStatus } from "@/schemas";

// The next event plus the three "later" rows under it.
const UPCOMING_LIMIT = 4;
const SHOWN_MESSAGES = 3;

export type ClubWeek = ReturnType<typeof useClubWeek>;

export function useClubWeek({
	groupId,
	channelId,
	isResponsesEnabled = false,
}: {
	groupId?: string;
	channelId?: string;
	isResponsesEnabled?: boolean;
}) {
	const utils = trpcClient.useUtils();
	const upcomingQuery = trpcClient.schedule.getUpcoming.useQuery({
		limit: UPCOMING_LIMIT,
		groupId,
	});
	const rsvp = trpcClient.schedule.rsvp.useMutation();
	const messagesQuery = trpcClient.chat.getMessages.useQuery(
		{ channelId: channelId ?? "", limit: SHOWN_MESSAGES * 2 },
		{ enabled: !!channelId },
	);
	const nextTraining = upcomingQuery.data?.nextTraining;
	const responsesQuery = trpcClient.schedule.getResponses.useQuery(
		{ eventId: nextTraining?.id ?? "" },
		{ enabled: isResponsesEnabled && !!nextTraining?.counts.noReply },
	);
	const nudge = trpcClient.schedule.nudge.useMutation();

	return {
		upcoming: upcomingQuery.data,
		rsvp: async (eventId: string, status: RsvpStatus) => {
			const result = await withErrorToast(
				rsvp.mutateAsync({ eventId, status }),
			);
			await utils.schedule.getUpcoming.invalidate();
			return result.status;
		},
		latestMessages: (messagesQuery.data?.data ?? [])
			.filter((message) => !message.deleted)
			.slice(0, SHOWN_MESSAGES)
			.reverse(),
		isLoadingMessages: messagesQuery.isPending,
		noReply: responsesQuery.data?.noReply ?? [],
		nudge: (eventId: string) => withErrorToast(nudge.mutateAsync({ eventId })),
	};
}
