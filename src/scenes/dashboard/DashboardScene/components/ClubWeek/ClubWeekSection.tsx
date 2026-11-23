"use client";

import { routes } from "@/lib/routes";
import type {
	ChatChannels,
	ChatMessage,
	UpcomingSchedule,
} from "@/lib/trpc/types";
import { FilterChip } from "@/scenes/schedule/ScheduleScene/components";
import type { RsvpStatus } from "@/schemas";
import { ClubWeekCards } from "./ClubWeekCards";

type MyGroup = { id: string; name: string };

interface ClubWeekSectionProps {
	upcoming: UpcomingSchedule | undefined;
	onRsvp: (eventId: string, status: RsvpStatus) => Promise<RsvpStatus | null>;
	latestMessages: ChatMessage[];
	isLoadingMessages: boolean;
	myGroups: MyGroup[];
	/** The group the cards are scoped to; leave out for all the viewer's groups. */
	group: MyGroup | undefined;
	channelId: string | undefined;
	myChannels: ChatChannels | undefined;
	onGroupChange: (groupId: string | null) => void;
}

export const ClubWeekSection = ({
	upcoming,
	onRsvp,
	latestMessages,
	isLoadingMessages,
	myGroups,
	group,
	channelId,
	myChannels,
	onGroupChange,
}: ClubWeekSectionProps) => {
	return (
		<section className="flex flex-col gap-3 px-4 lg:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-base font-semibold">This week at the club</h2>
				{myGroups.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						<FilterChip isActive={!group} onClick={() => onGroupChange(null)}>
							All my groups
						</FilterChip>
						{myGroups.map(({ id, name }) => (
							<FilterChip
								key={id}
								isActive={group?.id === id}
								onClick={() => onGroupChange(id)}
							>
								{name}
							</FilterChip>
						))}
					</div>
				)}
			</div>
			<ClubWeekCards
				key={group?.id ?? "mine"}
				upcoming={upcoming}
				onRsvp={onRsvp}
				group={group && { id: group.id, channelId }}
				latestMessages={latestMessages}
				isLoadingMessages={isLoadingMessages}
				myChannels={myChannels}
				scheduleHref={routes.schedule.list({ group: group?.id })}
			/>
		</section>
	);
};
