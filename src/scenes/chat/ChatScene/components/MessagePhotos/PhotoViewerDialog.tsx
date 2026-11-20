"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ChatMessage } from "@/lib/trpc/types";

interface PhotoViewerDialogProps {
	photo: ChatMessage["photos"][number] | null;
	alt: string;
	onClose: () => void;
}

export function PhotoViewerDialog({
	photo,
	alt,
	onClose,
}: PhotoViewerDialogProps) {
	return (
		<Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="w-auto max-w-[95vw] gap-0 overflow-hidden border-0 bg-black p-0 text-white sm:max-w-[95vw] max-sm:top-[50%] max-sm:bottom-auto max-sm:left-[50%] max-sm:max-w-[95vw] max-sm:translate-x-[-50%] max-sm:translate-y-[-50%] max-sm:rounded-lg max-sm:pb-0 max-sm:data-starting-style:translate-y-[-50%] max-sm:data-ending-style:translate-y-[-50%]">
				<DialogTitle className="sr-only">Photo</DialogTitle>
				{photo && (
					<div className="relative h-[90vh] w-[95vw]">
						<Image
							src={photo.url}
							alt={alt}
							fill
							unoptimized
							className="object-contain"
						/>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
