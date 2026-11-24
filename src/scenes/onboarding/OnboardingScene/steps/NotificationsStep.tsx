"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { NotificationPermissionState } from "@/hooks/useNotifications";

const SAMPLE_NOTIFICATIONS = [
	{
		title: "Masters · Mike Tran",
		body: "Wind's up — moving tomorrow to the erg room, 6:00.",
	},
	{
		title: "Schedule",
		body: "Head of the Wascana entries close today at 5 PM.",
	},
];

interface NotificationsStepProps {
	isLoading: boolean;
	isError: boolean;
	isSupported: boolean;
	needsHomeScreen: boolean;
	isConfigured: boolean;
	permission: NotificationPermissionState;
	isSubscribed: boolean;
	isEnabling: boolean;
	onEnable: () => void;
	onContinue: () => void;
	onSkip: () => void;
	onBack?: () => void;
}

export function NotificationsStep({
	isLoading,
	isError,
	isSupported,
	needsHomeScreen,
	isConfigured,
	permission,
	isSubscribed,
	isEnabling,
	onEnable,
	onContinue,
	onSkip,
	onBack,
}: NotificationsStepProps) {
	const isOn = permission === "granted" && isSubscribed;
	const unavailableReason = getUnavailableReason({
		isLoading,
		isError,
		needsHomeScreen,
		isSupported,
		isConfigured,
		permission,
	});

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold">Don't miss a launch</h2>
				<p className="text-muted-foreground">
					Practices get moved for wind. Turn on notifications to hear about
					changes, regatta updates and messages from your groups.
				</p>
			</div>

			<ul className="space-y-2" aria-label="Example notifications">
				{SAMPLE_NOTIFICATIONS.map((sample) => (
					<li
						key={sample.title}
						className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3"
					>
						<Image
							src="/logo.png"
							alt=""
							width={32}
							height={32}
							className="size-8 shrink-0 rounded-md"
						/>
						<div className="min-w-0 space-y-0.5">
							<p className="text-sm font-semibold">{sample.title}</p>
							<p className="text-sm text-muted-foreground">{sample.body}</p>
						</div>
					</li>
				))}
			</ul>

			{isOn ? (
				<p className="flex items-center gap-2 font-medium">
					<CheckCircle2 className="size-5 text-primary" />
					Notifications on
				</p>
			) : (
				unavailableReason && (
					<p className="text-sm text-muted-foreground">{unavailableReason}</p>
				)
			)}

			<div className="flex items-center justify-between gap-2">
				{onBack ? (
					<Button type="button" variant="ghost" onClick={onBack}>
						Back
					</Button>
				) : (
					<span />
				)}
				{isOn ? (
					<Button type="button" onClick={onContinue}>
						Continue
					</Button>
				) : (
					<div className="flex gap-2">
						<Button type="button" variant="outline" onClick={onSkip}>
							Not now
						</Button>
						<Button
							type="button"
							onClick={() => onEnable()}
							disabled={isLoading || isEnabling || unavailableReason !== null}
						>
							{isEnabling && <Loader2 className="animate-spin" />}
							Turn on notifications
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

function getUnavailableReason({
	isLoading,
	isError,
	needsHomeScreen,
	isSupported,
	isConfigured,
	permission,
}: {
	isLoading: boolean;
	isError: boolean;
	needsHomeScreen: boolean;
	isSupported: boolean;
	isConfigured: boolean;
	permission: NotificationPermissionState;
}) {
	if (isLoading) {
		return null;
	}
	if (isError) {
		return "Notifications can't be turned on right now. You can turn them on later in Settings.";
	}
	if (needsHomeScreen) {
		return "Notifications only work from the app on your home screen. Tap Share, then Add to Home Screen, and turn them on there.";
	}
	if (!isSupported) {
		return "This browser doesn't support notifications. You can turn them on later from another device.";
	}
	if (!isConfigured) {
		return "Notifications haven't been set up for the club yet. You can turn them on later in Settings.";
	}
	if (permission === "denied") {
		return "Notifications are blocked for this site. Allow them in your browser settings to turn them on.";
	}
	return null;
}
