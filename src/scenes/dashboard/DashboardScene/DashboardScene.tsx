"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { type default as React, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AthleteProfilePrompt } from "@/components/athlete-profile-prompt";
import { NotificationsBanner } from "@/components/notifications-banner";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { trpcClient } from "@/lib/trpc/client";
import { AthleteDetailsDrawer } from "@/scenes/athletes/AthleteListScene/components";
import {
	ClubWeekSection,
	IntegrationAlert,
	LeaderboardTable,
	LeaderboardTableSkeleton,
	MetersTimeSeriesChart,
	MetersTimeSeriesChartSkeleton,
	MobileHeader,
} from "@/scenes/dashboard/DashboardScene/components";
import { AnalyticMetricCards } from "@/scenes/dashboard/DashboardScene/components/AnalyticMetricCards/AnalyticMetricCards";
import { AnalyticMetricCardsSkeleton } from "@/scenes/dashboard/DashboardScene/components/AnalyticMetricCards/AnalyticMetricCardsSkeleton";
import { useClubWeek } from "./hooks/useClubWeek";

export const DashboardScene = () => {
	const [period, setPeriod] = useState<
		"three_months" | "thirty_days" | "seven_days"
	>("three_months");

	const { user, hasAthlete } = useCurrentUser();
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [clubWeekGroupId, setClubWeekGroupId] = useState<string | null>(null);
	const notifications = useNotifications({ enabled: hasAthlete });
	const analyticsQuery = trpcClient.analytics.getAnalytics.useQuery();
	const groupsQuery = trpcClient.groups.getGroups.useQuery();
	const leaderboardQuery = trpcClient.analytics.getLeaderboard.useQuery(
		{ period },
		{ placeholderData: keepPreviousData },
	);
	const myGroupsQuery = trpcClient.groups.getMyGroups.useQuery();
	const channelsQuery = trpcClient.chat.getChannels.useQuery();
	const myGroups = myGroupsQuery.data?.data ?? [];
	const clubWeekGroup = myGroups.find(({ id }) => id === clubWeekGroupId);
	const clubWeekChannelId =
		clubWeekGroup &&
		channelsQuery.data?.data.find(
			(channel) => channel.groupId === clubWeekGroup.id,
		)?.id;
	const clubWeek = useClubWeek({
		groupId: clubWeekGroup?.id,
		channelId: clubWeekChannelId,
	});
	const myGroupIds = new Set(myGroups.map((group) => group.id));
	// Everyone, the viewer's groups and their direct messages.
	const myChannels =
		channelsQuery.data && myGroupsQuery.data
			? channelsQuery.data.data.filter((channel) =>
					channel.kind === "group"
						? !!channel.groupId && myGroupIds.has(channel.groupId)
						: !channel.hasOnlyFormerMembers,
				)
			: undefined;
	const profileAthleteQuery = trpcClient.athletes.getCurrentAthlete.useQuery(
		undefined,
		{ enabled: isProfileOpen },
	);
	const profileStatsQuery = trpcClient.athletes.getAthleteStats.useQuery(
		{ athleteId: user.id },
		{ enabled: isProfileOpen },
	);
	const profileActivitiesQuery = trpcClient.activities.getActivities.useQuery(
		{ athleteId: user.id },
		{ enabled: isProfileOpen },
	);

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader breadcrumbs={[]} />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<MobileHeader onOpenProfile={() => setIsProfileOpen(true)} />
							<NotificationsBanner
								isLoading={notifications.isLoading}
								isError={notifications.isError}
								isSupported={notifications.supported}
								isConfigured={notifications.configured}
								permission={notifications.permission}
								isSubscribed={notifications.subscribed}
								isEnabling={notifications.isPending}
								onEnable={notifications.enable}
								className="mx-4 w-auto lg:mx-6"
							/>
							{!hasAthlete && (
								<div className="px-4 lg:px-6">
									<AthleteProfilePrompt />
								</div>
							)}
							<IntegrationAlert />
							{analyticsQuery.isPending ? (
								<AnalyticMetricCardsSkeleton />
							) : analyticsQuery.data ? (
								<AnalyticMetricCards
									data={analyticsQuery.data.analyticMetrics}
								/>
							) : null}
							<ClubWeekSection
								upcoming={clubWeek.upcoming}
								onRsvp={clubWeek.rsvp}
								latestMessages={clubWeek.latestMessages}
								isLoadingMessages={clubWeek.isLoadingMessages}
								myGroups={myGroups}
								group={clubWeekGroup}
								channelId={clubWeekChannelId}
								myChannels={myChannels}
								onGroupChange={setClubWeekGroupId}
							/>
							{analyticsQuery.isPending ? (
								<div className="px-4 lg:px-6">
									<MetersTimeSeriesChartSkeleton />
								</div>
							) : (
								analyticsQuery.data &&
								analyticsQuery.data.metersTimeSeries.length > 0 && (
									<div className="px-4 lg:px-6">
										<MetersTimeSeriesChart
											data={analyticsQuery.data.metersTimeSeries}
											timeRange={period}
											setTimeRange={setPeriod}
										/>
									</div>
								)
							)}
							{leaderboardQuery.isPending ? (
								<LeaderboardTableSkeleton />
							) : (
								<LeaderboardTable
									data={leaderboardQuery.data?.data ?? []}
									groups={groupsQuery.data?.data ?? []}
								/>
							)}
						</div>
					</div>
				</div>
			</SidebarInset>
			<AthleteDetailsDrawer
				isOpen={isProfileOpen}
				athlete={profileAthleteQuery.data ?? null}
				activities={profileActivitiesQuery.data?.data ?? []}
				athleteStats={profileStatsQuery.data ?? null}
				canEdit={false}
				startEditing={false}
				canMessage={() => false}
				isMessaging={() => false}
				onMessage={() => {}}
				onClose={() => setIsProfileOpen(false)}
				onSubmit={() => {}}
			/>
		</SidebarProvider>
	);
};
