"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { useNotifications } from "@/hooks/useNotifications";
import { channelNotificationScope } from "@/lib/notifications";

export const ChannelNotificationToggle = ({
	channelId,
	notifications: { preferences, setPreference, isLoading },
	className,
}: {
	channelId: string;
	notifications: Pick<
		ReturnType<typeof useNotifications>,
		"preferences" | "setPreference" | "isLoading"
	>;
	className?: string;
}) => {
	const scope = channelNotificationScope(channelId);
	const isMuted = preferences[scope] === false;
	const label = isMuted
		? "Unmute notifications for this channel"
		: "Mute notifications for this channel";

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className={className}
						aria-label={label}
						aria-pressed={isMuted}
						disabled={isLoading}
						onClick={() => setPreference(scope, isMuted)}
					/>
				}
			>
				{isMuted ? <BellOff /> : <Bell />}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
};
