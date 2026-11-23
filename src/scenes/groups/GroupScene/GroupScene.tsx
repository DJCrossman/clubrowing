"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { NotificationsBanner } from "@/components/notifications-banner";
import { useCurrentUser } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { routes } from "@/lib/routes";
import { getClubToday } from "@/lib/schedule/week";
import { trpcClient } from "@/lib/trpc/client";
import type { Group } from "@/lib/trpc/types";
import {
	AvailabilityCard,
	ClubWeekCards,
	LeaderboardTable,
	LeaderboardTableSkeleton,
	MetersTimeSeriesChart,
	MetersTimeSeriesChartSkeleton,
} from "@/scenes/dashboard/DashboardScene/components";
import { useClubWeek } from "@/scenes/dashboard/DashboardScene/hooks/useClubWeek";
import { GroupMembersCard, GroupShell } from "./components";

interface GroupSceneProps {
	group: Group;
}

export const GroupScene = ({ group }: GroupSceneProps) => {
	const { isAdmin } = useCurrentUser();
	const notifications = useNotifications();
	const [period, setPeriod] = useState<
		"three_months" | "thirty_days" | "seven_days"
	>("three_months");
	const groupsQuery = trpcClient.groups.getGroups.useQuery();
	const clubWeek = useClubWeek({
		groupId: group.id,
		channelId: group.channelId,
		isResponsesEnabled: true,
	});
	const metersQuery = trpcClient.analytics.getGroupMeters.useQuery({
		id: group.id,
	});
	const leaderboardQuery = trpcClient.analytics.getLeaderboard.useQuery(
		{ period },
		{ placeholderData: keepPreviousData },
	);
	const memberIds = useMemo(
		() => new Set(group.members.map((member) => member.id)),
		[group.members],
	);
	const scheduleRoutes = routes.groups.schedule(group.id);

	return (
		<GroupShell
			group={group}
			active="overview"
			notificationPreferences={notifications.preferences}
			isLoadingNotifications={notifications.isLoading}
			onNotificationPreferenceChange={notifications.setPreference}
			banner={
				<NotificationsBanner
					isLoading={notifications.isLoading}
					isError={notifications.isError}
					isSupported={notifications.supported}
					isConfigured={notifications.configured}
					permission={notifications.permission}
					isSubscribed={notifications.subscribed}
					isEnabling={notifications.isPending}
					onEnable={notifications.enable}
					className="mx-4 mt-3 w-auto lg:mx-6"
				/>
			}
		>
			<div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4 lg:px-6">
					<ClubWeekCards
						upcoming={clubWeek.upcoming}
						onRsvp={clubWeek.rsvp}
						group={{ id: group.id, channelId: group.channelId }}
						latestMessages={clubWeek.latestMessages}
						isLoadingMessages={clubWeek.isLoadingMessages}
						scheduleHref={scheduleRoutes.list()}
					>
						<AvailabilityCard
							event={clubWeek.upcoming?.nextTraining}
							today={getClubToday()}
							isAdmin={isAdmin}
							responsesHref={(eventId) => scheduleRoutes.view({ id: eventId })}
							noReply={clubWeek.noReply}
							onNudge={clubWeek.nudge}
						/>
						<GroupMembersCard group={group} isAdmin={isAdmin} />
					</ClubWeekCards>
				</div>
				<div className="px-4 lg:px-6">
					{metersQuery.isPending ? (
						<MetersTimeSeriesChartSkeleton />
					) : (
						<MetersTimeSeriesChart
							data={metersQuery.data?.metersTimeSeries ?? []}
							scopeLabel={group.name}
							timeRange={period}
							setTimeRange={setPeriod}
						/>
					)}
				</div>
				{leaderboardQuery.isPending ? (
					<LeaderboardTableSkeleton />
				) : (
					<LeaderboardTable
						data={(leaderboardQuery.data?.data ?? []).filter((row) =>
							memberIds.has(row.id),
						)}
						groups={groupsQuery.data?.data ?? []}
						initialGroupIds={[group.id]}
					/>
				)}
			</div>
		</GroupShell>
	);
};
