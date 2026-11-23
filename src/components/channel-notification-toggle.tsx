"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	channelNotificationScope,
	type NotificationPreferences,
} from "@/lib/notifications";

export const ChannelNotificationToggle = ({
	channelId,
	preferences,
	isLoading,
	onPreferenceChange,
	className,
}: {
	channelId: string;
	preferences: NotificationPreferences;
	isLoading: boolean;
	onPreferenceChange: (scope: string, isEnabled: boolean) => void;
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
						onClick={() => onPreferenceChange(scope, isMuted)}
					/>
				}
			>
				{isMuted ? <BellOff /> : <Bell />}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
};
