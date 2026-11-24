"use client";

import Image from "next/image";
import type { ComponentProps, ReactElement } from "react";
import { useDrawerContentContainer } from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { Gif } from "@/lib/giphy";
import { PickerSearch } from "../PickerSearch/PickerSearch";

interface GifPickerProps {
	children: ReactElement;
	anchor?: ComponentProps<typeof PopoverContent>["anchor"];
	search: string | null;
	gifs: Gif[] | undefined;
	isLoading: boolean;
	hasFailed: boolean;
	onSearchChange: (search: string | null) => void;
	onSelect: (gif: Gif) => void;
}

export function GifPicker({
	children,
	anchor,
	search,
	gifs,
	isLoading,
	hasFailed,
	onSearchChange,
	onSelect,
}: GifPickerProps) {
	const container = useDrawerContentContainer();

	return (
		<Popover
			open={search !== null}
			onOpenChange={(open) => onSearchChange(open ? "" : null)}
		>
			<PopoverTrigger render={children} />
			<PopoverContent
				container={container ?? undefined}
				align="start"
				anchor={anchor}
				sticky={!anchor}
				className="flex max-h-(--available-height) w-[380px] flex-col gap-2 rounded-xl border-input bg-card p-2.5"
			>
				<PickerSearch
					value={search ?? ""}
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder="Search GIFs"
				/>
				<div className="grid max-h-[318px] grid-cols-2 gap-1.5 overflow-y-auto">
					{!hasFailed &&
						isLoading &&
						Array.from({ length: 6 }, (_, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
							<Skeleton key={index} className="h-[100px] rounded-lg" />
						))}
					{!hasFailed &&
						gifs?.map((gif) => (
							<button
								key={gif.id}
								type="button"
								aria-label={`Send GIF: ${gif.title || "GIF"}`}
								onClick={() => {
									onSelect(gif);
									onSearchChange(null);
								}}
								className="relative h-[100px] overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								<Image
									src={
										gif.images.fixed_width.webp || gif.images.fixed_width.url
									}
									alt=""
									fill
									unoptimized
									className="object-cover"
								/>
							</button>
						))}
				</div>
				{!hasFailed && gifs?.length === 0 && (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No GIFs found
					</p>
				)}
				{hasFailed && (
					<p className="py-6 text-center text-sm text-muted-foreground">
						GIFs aren't loading right now. Try again in a bit.
					</p>
				)}
				<p className="text-[11px] text-muted-foreground">Powered by GIPHY</p>
			</PopoverContent>
		</Popover>
	);
}
