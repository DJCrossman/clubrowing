"use client";

import { IconFile, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { isPicture } from "@/schemas/chat.schema";
import { ComposerPicture } from "./ComposerPicture";

interface ComposerFileStripProps {
	files: File[];
	disabled: boolean;
	onRemove: (index: number) => void;
}

export function ComposerFileStrip({
	files,
	disabled,
	onRemove,
}: ComposerFileStripProps) {
	return (
		<ul className="flex flex-wrap gap-2 px-3 pt-3">
			{files.map((file, index) => (
				<li
					key={`${file.name}-${file.lastModified}-${index}`}
					className={cn(
						"relative h-16 overflow-hidden rounded-lg bg-muted",
						isPicture(file)
							? "w-16"
							: "flex max-w-60 min-w-0 items-center gap-2 pr-8 pl-3",
					)}
				>
					{isPicture(file) && <ComposerPicture file={file} />}
					{!isPicture(file) && (
						<>
							<IconFile
								aria-hidden
								className="size-5 shrink-0 text-muted-foreground"
							/>
							<div className="flex min-w-0 flex-col">
								<span className="truncate text-[13px]" title={file.name}>
									{file.name}
								</span>
								<span className="text-xs text-muted-foreground">
									{file.size < 1024 * 1024
										? `${Math.ceil(file.size / 1024)} KB`
										: `${(file.size / 1024 / 1024).toFixed(1)} MB`}
								</span>
							</div>
						</>
					)}
					<button
						type="button"
						aria-label={`Remove ${file.name}`}
						title={`Remove ${file.name}`}
						disabled={disabled}
						onClick={() => onRemove(index)}
						className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 disabled:opacity-50 [&_svg]:size-3"
					>
						<IconX />
					</button>
				</li>
			))}
		</ul>
	);
}
