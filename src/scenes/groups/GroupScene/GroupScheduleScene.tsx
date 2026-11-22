"use client";

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
		<GroupShell group={group} active="schedule" notifications={notifications}>
			<ScheduleView
				{...props}
				scheduleRoutes={routes.groups.schedule(group.id)}
			/>
		</GroupShell>
	);
};
