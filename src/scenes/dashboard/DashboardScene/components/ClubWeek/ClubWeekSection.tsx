"use client";

import { routes } from "@/lib/routes";
import type { ChatChannels } from "@/lib/trpc/types";
import { FilterChip } from "@/scenes/schedule/ScheduleScene/components";
import type { ClubWeek } from "../../hooks/useClubWeek";
import { ClubWeekCards } from "./ClubWeekCards";

type MyGroup = { id: string; name: string };

interface ClubWeekSectionProps {
	clubWeek: ClubWeek;
	myGroups: MyGroup[];
	/** The group the cards are scoped to; leave out for all the viewer's groups. */
	group: MyGroup | undefined;
	channelId: string | undefined;
	myChannels: ChatChannels | undefined;
	onGroupChange: (groupId: string | null) => void;
}

export const ClubWeekSection = ({
	clubWeek,
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
				clubWeek={clubWeek}
				group={group && { id: group.id, channelId }}
				myChannels={myChannels}
				scheduleHref={routes.schedule.list({ group: group?.id })}
			/>
		</section>
	);
};
