"use client";

import { NotificationsBanner } from "@/components/notifications-banner";
import { useNotifications } from "@/hooks/useNotifications";
import { routes } from "@/lib/routes";
import type { Group } from "@/lib/trpc/types";
import {
	ScheduleView,
	type ScheduleViewProps,
} from "@/scenes/schedule/ScheduleScene/ScheduleView";
import { GroupShell } from "./components";

interface GroupScheduleSceneProps extends ScheduleViewProps {
	group: Group;
}

export const GroupScheduleScene = ({
	group,
	...props
}: GroupScheduleSceneProps) => {
	const notifications = useNotifications();

	return (
		<GroupShell
			group={group}
			active="schedule"
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
			<ScheduleView
				{...props}
				scheduleRoutes={routes.groups.schedule(group.id)}
			/>
		</GroupShell>
	);
};
