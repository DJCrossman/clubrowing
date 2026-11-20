"use client";

import { XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export const FullscreenImageOverlay = ({
	src,
	onClose,
}: {
	src: string;
	onClose: () => void;
}) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onClose();
			}
		};

		window.addEventListener("mousedown", handleClickOutside);
		return () => {
			window.removeEventListener("mousedown", handleClickOutside);
		};
	}, [onClose]);

	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			ref={ref}
			className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
		>
			<div className="relative w-full h-full">
				<Image
					src={src}
					alt="ERG activity screenshot (fullscreen)"
					fill
					unoptimized
					className="object-contain"
				/>
			</div>
			<div className="absolute top-4 right-4">
				<Button
					type="button"
					variant="secondary"
					size="icon"
					onClick={onClose}
					aria-label="Close fullscreen"
				>
					<XIcon className="h-4 w-4" />
				</Button>
			</div>
		</div>,
		document.body,
	);
};
