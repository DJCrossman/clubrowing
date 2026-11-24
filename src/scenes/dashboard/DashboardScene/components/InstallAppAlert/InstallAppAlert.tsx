"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const DISMISSED_STORAGE_KEY = "dashboard.installAppAlert.dismissed";

export const InstallAppAlert = ({
	canInstall,
	canInstallFromShareMenu,
	onInstall,
}: {
	canInstall: boolean;
	canInstallFromShareMenu: boolean;
	onInstall: () => void;
}) => {
	const [isDismissed, setIsDismissed] = useState(true);

	useEffect(() => {
		setIsDismissed(
			window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "true",
		);
	}, []);

	if (isDismissed) return null;
	if (!canInstall && !canInstallFromShareMenu) return null;

	return (
		<div className="px-4 lg:px-6">
			<Alert className="relative pr-12">
				<Download />
				<AlertTitle>Install the app</AlertTitle>
				<AlertDescription>
					{canInstall && (
						<>
							<span>Open it from your home screen like any other app.</span>
							<button
								type="button"
								className="cursor-pointer font-medium text-primary underline underline-offset-4"
								onClick={() => onInstall()}
							>
								Install app
							</button>
						</>
					)}
					{canInstallFromShareMenu && (
						<span>
							Tap Share, then Add to Home Screen to open it like any other app.
						</span>
					)}
				</AlertDescription>
				<Button
					variant="ghost"
					size="icon"
					className="absolute top-2 right-2 size-7"
					onClick={() => {
						window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
						setIsDismissed(true);
					}}
					aria-label="Dismiss"
				>
					<X className="size-4" />
				</Button>
			</Alert>
		</div>
	);
};
