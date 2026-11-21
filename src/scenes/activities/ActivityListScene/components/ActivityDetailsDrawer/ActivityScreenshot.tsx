"use client";

import Image from "next/image";
import { SectionLabel } from "@/components/drawer-details";
import type { Activity } from "@/lib/trpc/types";
import { FullscreenImageOverlay } from "../FullscreenImageOverlay/FullscreenImageOverlay";

interface ActivityScreenshotProps {
	activity: Activity;
	isImageFullscreen: boolean;
	setIsImageFullscreen: (isFullscreen: boolean) => void;
}

export const ActivityScreenshot = ({
	activity,
	isImageFullscreen,
	setIsImageFullscreen,
}: ActivityScreenshotProps) => {
	if (!activity.hasScreenshot) {
		return null;
	}

	const src = `/api/v1/activities/${activity.id}/screenshot`;

	return (
		<div className="space-y-3">
			<SectionLabel>Screenshot</SectionLabel>
			<button
				type="button"
				className="relative block aspect-video w-full max-w-md overflow-hidden rounded-lg border"
				onClick={() => setIsImageFullscreen(true)}
			>
				<Image
					src={src}
					alt="Activity screenshot"
					fill
					unoptimized
					className="object-contain"
				/>
			</button>
			{isImageFullscreen && (
				<FullscreenImageOverlay
					src={src}
					onClose={() => setIsImageFullscreen(false)}
				/>
			)}
		</div>
	);
};
