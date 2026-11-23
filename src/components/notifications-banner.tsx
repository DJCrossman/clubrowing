"use client";

import { BellOff, BellRing, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import type { NotificationPermissionState } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const DISMISSED_STORAGE_KEY = "notificationsBanner.dismissed";

export const NotificationsBanner = ({
	isLoading,
	isError,
	isSupported,
	isConfigured,
	permission,
	isSubscribed,
	isEnabling,
	onEnable,
	className,
}: {
	isLoading: boolean;
	isError: boolean;
	isSupported: boolean;
	isConfigured: boolean;
	permission: NotificationPermissionState;
	isSubscribed: boolean;
	isEnabling: boolean;
	onEnable: () => void;
	className?: string;
}) => {
	const { hasAthlete } = useCurrentUser();
	const [dismissed, setDismissed] = useState(true);

	useEffect(() => {
		setDismissed(readDismissed());
	}, []);

	if (
		!hasAthlete ||
		dismissed ||
		isLoading ||
		isError ||
		!isSupported ||
		(permission === "granted" && isSubscribed)
	) {
		return null;
	}

	const onDismiss = () => {
		try {
			window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, "1");
		} catch {}
		setDismissed(true);
	};

	const variant = !isConfigured
		? "unconfigured"
		: permission === "denied"
			? "blocked"
			: "off";
	const { title, description } = COPY[variant];
	const Icon = variant === "off" ? BellRing : BellOff;

	return (
		<Alert className={cn("relative pr-12", className)}>
			<AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<div className="flex items-start gap-3">
					<Icon className="mt-[3px] size-4 shrink-0 text-foreground" />
					<p>
						<span className="font-semibold text-foreground">{title}</span>{" "}
						{description}
					</p>
				</div>
				{variant === "off" && (
					<Button size="sm" onClick={() => onEnable()} disabled={isEnabling}>
						{isEnabling && <Loader2 className="animate-spin" />}
						Turn on notifications
					</Button>
				)}
			</AlertDescription>
			<Button
				variant="ghost"
				size="icon"
				className="absolute top-2 right-2 size-7"
				onClick={onDismiss}
				aria-label="Dismiss"
			>
				<X className="size-4" />
			</Button>
		</Alert>
	);
};

const COPY = {
	off: {
		title: "Notifications are off.",
		description:
			"Turn them on so you don't miss practice changes or messages from your groups.",
	},
	blocked: {
		title: "Notifications are blocked.",
		description:
			"Allow notifications for this site in your browser settings so you don't miss practice changes or messages from your groups.",
	},
	unconfigured: {
		title: "Notifications aren't set up yet.",
		description:
			"Push notifications haven't been configured on the server, so there's nothing to turn on for now.",
	},
} as const;

function readDismissed() {
	try {
		return window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}
