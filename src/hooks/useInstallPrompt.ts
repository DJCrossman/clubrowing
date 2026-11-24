"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}

export function useInstallPrompt() {
	const [installPrompt, setInstallPrompt] =
		useState<BeforeInstallPromptEvent>();
	const canInstallFromShareMenu = useSyncExternalStore(
		() => () => {},
		() => "standalone" in navigator && navigator.standalone === false,
		() => false,
	);

	useEffect(() => {
		const offerInstall = (event: BeforeInstallPromptEvent) => {
			// Keeps Chrome's own install banner from showing beside ours.
			event.preventDefault();
			setInstallPrompt(event);
		};
		const forgetInstall = () => setInstallPrompt(undefined);
		window.addEventListener("beforeinstallprompt", offerInstall);
		window.addEventListener("appinstalled", forgetInstall);
		return () => {
			window.removeEventListener("beforeinstallprompt", offerInstall);
			window.removeEventListener("appinstalled", forgetInstall);
		};
	}, []);

	return {
		canInstall: installPrompt !== undefined,
		canInstallFromShareMenu,
		install: async () => {
			// Chrome opens its install dialog once per offer, whatever the answer.
			setInstallPrompt(undefined);
			if (!installPrompt) return false;
			await installPrompt.prompt();
			const { outcome } = await installPrompt.userChoice;
			return outcome === "accepted";
		},
	};
}
