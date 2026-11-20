"use client";

import Image from "next/image";
import { useState } from "react";
import type { ChatMessage } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";
import { PhotoViewerDialog } from "./PhotoViewerDialog";

type MessagePhoto = ChatMessage["photos"][number];

interface MessagePhotosProps {
	photos: MessagePhoto[];
	authorName: string;
	compact?: boolean;
}

export function MessagePhotos({
	photos,
	authorName,
	compact = false,
}: MessagePhotosProps) {
	const [viewingPhoto, setViewingPhoto] = useState<MessagePhoto | null>(null);
	const isGrid = photos.length > 1;

	return (
		<>
			<div className={cn(isGrid && "grid w-full max-w-80 grid-cols-2 gap-1")}>
				{photos.map((photo, index) => (
					<button
						key={photo.id}
						type="button"
						aria-label={
							isGrid
								? `View photo ${index + 1} of ${photos.length}`
								: "View photo"
						}
						onClick={() => setViewingPhoto(photo)}
						className={cn(
							"relative block overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
							isGrid && "aspect-[3/2] w-full rounded-lg",
							!isGrid && !compact && "h-40 w-60 rounded-[10px]",
							!isGrid && compact && "h-[130px] w-[200px] rounded-lg",
						)}
					>
						<Image
							src={photo.thumbnailUrl}
							alt={`Photo from ${authorName}`}
							fill
							unoptimized
							loading="lazy"
							className="object-cover"
						/>
					</button>
				))}
			</div>
			<PhotoViewerDialog
				photo={viewingPhoto}
				alt={`Photo from ${authorName}`}
				onClose={() => setViewingPhoto(null)}
			/>
		</>
	);
}
