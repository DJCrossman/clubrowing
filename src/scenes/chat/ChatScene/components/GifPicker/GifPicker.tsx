"use client";

import Image from "next/image";
import { type ReactElement, useState } from "react";
import { useDrawerContentContainer } from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { PickerSearch } from "../PickerSearch/PickerSearch";
import { useGiphy } from "./useGiphy";

interface GifPickerProps {
	children: ReactElement;
	onSelect: (gif: { id: string; title: string }) => void;
}

export function GifPicker({ children, onSelect }: GifPickerProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const container = useDrawerContentContainer();
	const { isPaused, searchQuery, rememberGif } = useGiphy({
		query,
		isEnabled: open,
	});
	const hasFailed = searchQuery.isError || isPaused;

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setQuery("");
			}}
		>
			<PopoverTrigger render={children} />
			<PopoverContent
				container={container ?? undefined}
				align="start"
				sticky
				className="flex max-h-(--available-height) w-[380px] flex-col gap-2 rounded-xl border-input bg-card p-2.5"
			>
				<PickerSearch
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search GIFs"
				/>
				<div className="grid max-h-[318px] grid-cols-2 gap-1.5 overflow-y-auto">
					{!hasFailed &&
						searchQuery.isPending &&
						Array.from({ length: 6 }, (_, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
							<Skeleton key={index} className="h-[100px] rounded-lg" />
						))}
					{!hasFailed &&
						searchQuery.data?.map((gif) => (
							<button
								key={gif.id}
								type="button"
								aria-label={`Send GIF: ${gif.title || "GIF"}`}
								onClick={() => {
									rememberGif(gif);
									onSelect({ id: gif.id, title: gif.title || "GIF" });
									setOpen(false);
									setQuery("");
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
				{!hasFailed && searchQuery.data?.length === 0 && (
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
