"use client";

import Image from "next/image";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGiphy } from "./useGiphy";

const VARIANTS = {
	message: { height: 160, skeleton: "h-40 w-60", rounded: "rounded-[10px]" },
	compact: {
		height: 130,
		skeleton: "h-[130px] w-[200px]",
		rounded: "rounded-lg",
	},
};

export function MessageGif({
	id,
	title,
	variant,
}: {
	id: string;
	title: string;
	variant: keyof typeof VARIANTS;
}) {
	const { canUseGifs, isPaused, gifQuery } = useGiphy({ gifId: id });
	const [image, setImage] = useState<"loading" | "loaded" | "failed">(
		"loading",
	);
	const { height, skeleton, rounded } = VARIANTS[variant];
	const rendition = gifQuery.data?.images.fixed_height;
	const showLabel =
		!canUseGifs ||
		isPaused ||
		gifQuery.isError ||
		gifQuery.data === null ||
		image === "failed";

	return (
		<>
			{showLabel && (
				<p className="text-xs text-muted-foreground">GIF: {title}</p>
			)}
			{!showLabel && (
				<div className="relative max-w-full" style={{ height }}>
					{image === "loading" && (
						<Skeleton className={cn("max-w-full", skeleton, rounded)} />
					)}
					{rendition && (
						<Image
							src={rendition.webp || rendition.url}
							alt={title}
							width={Math.round((rendition.width * height) / rendition.height)}
							height={height}
							unoptimized
							loading="lazy"
							onLoad={() => setImage("loaded")}
							onError={() => setImage("failed")}
							className={cn(
								"h-full w-auto max-w-full object-contain",
								rounded,
								image === "loading" && "absolute inset-0 opacity-0",
							)}
						/>
					)}
				</div>
			)}
		</>
	);
}
