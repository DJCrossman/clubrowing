"use client";

import type { ReactNode } from "react";
import { getClubToday } from "@/lib/schedule/week";
import type {
	ChatChannels,
	ChatMessage,
	UpcomingSchedule,
} from "@/lib/trpc/types";
import type { RsvpStatus } from "@/schemas";
import { LatestChatCard } from "./LatestChatCard";
import { MessagesCard } from "./MessagesCard";
import { NeedsReplyCard } from "./NeedsReplyCard";
import { UpNextCard } from "./UpNextCard";

interface ClubWeekCardsProps {
	upcoming: UpcomingSchedule | undefined;
	onRsvp: (eventId: string, status: RsvpStatus) => Promise<RsvpStatus | null>;
	/** Scope to one group; leave out for everything the viewer is in. */
	group?: { id: string; channelId: string | undefined };
	/** The group chat's latest messages, shown when scoped to a group. */
	latestMessages: ChatMessage[];
	isLoadingMessages: boolean;
	/** The viewer's chats, listed when the cards are not scoped to a group. */
	myChannels?: ChatChannels;
	scheduleHref: string;
	children?: ReactNode;
}

export const ClubWeekCards = ({
	upcoming,
	onRsvp,
	group,
	latestMessages,
	isLoadingMessages,
	myChannels,
	scheduleHref,
	children,
}: ClubWeekCardsProps) => {
	const today = getClubToday();

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-3">
			<UpNextCard
				events={upcoming?.next}
				today={today}
				scheduleHref={scheduleHref}
				onRsvp={onRsvp}
			/>
			<NeedsReplyCard
				events={upcoming?.pendingRsvps}
				today={today}
				onRsvp={onRsvp}
			/>
			{group ? (
				<LatestChatCard
					channelId={group.channelId}
					messages={latestMessages}
					isLoading={isLoadingMessages}
				/>
			) : (
				<MessagesCard channels={myChannels} />
			)}
			{children}
		</div>
	);
};
