"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionLabel } from "@/components/drawer-details";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/trpc/types";
import { FullscreenImageOverlay } from "../FullscreenImageOverlay/FullscreenImageOverlay";

interface ActivityScreenshotProps {
	activity: Activity;
	canAddScreenshot: boolean;
	onAddScreenshot: (file: File) => Promise<void>;
	isImageFullscreen: boolean;
	setIsImageFullscreen: (isFullscreen: boolean) => void;
}

export const ActivityScreenshot = ({
	activity,
	canAddScreenshot,
	onAddScreenshot,
	isImageFullscreen,
	setIsImageFullscreen,
}: ActivityScreenshotProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [picked, setPicked] = useState<{ file: File; url: string } | null>(
		null,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		if (!picked) return;
		return () => URL.revokeObjectURL(picked.url);
	}, [picked]);

	if (!activity.hasScreenshot && !canAddScreenshot) {
		return null;
	}

	const src = activity.hasScreenshot
		? `/api/v1/activities/${activity.id}/screenshot`
		: picked?.url;

	return (
		<div className="space-y-3">
			<SectionLabel>Screenshot</SectionLabel>
			{!!src && (
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
			)}
			{!activity.hasScreenshot && !picked && (
				<>
					<input
						ref={inputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (!file) return;
							setSaveError(null);
							setPicked({ file, url: URL.createObjectURL(file) });
						}}
					/>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => inputRef.current?.click()}
					>
						Add screenshot
					</Button>
				</>
			)}
			{!activity.hasScreenshot && !!picked && (
				<>
					<p className="text-sm text-muted-foreground">
						A screenshot can't be changed once it's saved.
					</p>
					{saveError && <p className="text-sm text-destructive">{saveError}</p>}
					<div className="flex gap-2">
						<Button
							variant="outline"
							className="flex-1"
							disabled={isSaving}
							onClick={() => {
								setPicked(null);
								setSaveError(null);
							}}
						>
							Cancel
						</Button>
						<Button
							className="flex-1"
							disabled={isSaving}
							onClick={async () => {
								setIsSaving(true);
								setSaveError(null);
								try {
									await onAddScreenshot(picked.file);
								} catch (error) {
									setSaveError(
										error instanceof Error
											? error.message
											: "The screenshot couldn't be saved. Try again.",
									);
									setIsSaving(false);
								}
							}}
						>
							{isSaving ? "Saving..." : "Save"}
						</Button>
					</div>
				</>
			)}
			{isImageFullscreen && !!src && (
				<FullscreenImageOverlay
					src={src}
					onClose={() => setIsImageFullscreen(false)}
				/>
			)}
		</div>
	);
};
