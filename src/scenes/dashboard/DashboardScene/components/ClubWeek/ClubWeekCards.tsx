"use client";

import type { ReactNode } from "react";
import { useCurrentUser } from "@/hooks/useAuth";
import { getClubToday } from "@/lib/schedule/week";
import type { ChatChannels } from "@/lib/trpc/types";
import type { ClubWeek } from "../../hooks/useClubWeek";
import { AvailabilityCard } from "./AvailabilityCard";
import { LatestChatCard } from "./LatestChatCard";
import { MessagesCard } from "./MessagesCard";
import { NeedsReplyCard } from "./NeedsReplyCard";
import { UpNextCard } from "./UpNextCard";

interface ClubWeekCardsProps {
	clubWeek: ClubWeek;
	/** Scope to one group; leave out for everything the viewer is in. */
	group?: { id: string; channelId: string | undefined };
	/** The viewer's chats, listed when the cards are not scoped to a group. */
	myChannels?: ChatChannels;
	scheduleHref: string;
	/** Shows the next training's availability, linking to its responses. */
	responsesHref?: (eventId: string) => string;
	children?: ReactNode;
}

export const ClubWeekCards = ({
	clubWeek,
	group,
	myChannels,
	scheduleHref,
	responsesHref,
	children,
}: ClubWeekCardsProps) => {
	const { isAdmin } = useCurrentUser();
	const today = getClubToday();

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-3">
			<UpNextCard
				events={clubWeek.upcoming?.next}
				today={today}
				scheduleHref={scheduleHref}
				onRsvp={clubWeek.rsvp}
			/>
			<NeedsReplyCard
				events={clubWeek.upcoming?.pendingRsvps}
				today={today}
				onRsvp={clubWeek.rsvp}
			/>
			{group ? (
				<LatestChatCard
					channelId={group.channelId}
					messages={clubWeek.latestMessages}
					isLoading={clubWeek.isLoadingMessages}
				/>
			) : (
				<MessagesCard channels={myChannels} />
			)}
			{responsesHref && (
				<AvailabilityCard
					event={clubWeek.upcoming?.nextTraining}
					today={today}
					isAdmin={isAdmin}
					responsesHref={responsesHref}
					noReply={clubWeek.noReply}
					onNudge={clubWeek.nudge}
				/>
			)}
			{children}
		</div>
	);
};
