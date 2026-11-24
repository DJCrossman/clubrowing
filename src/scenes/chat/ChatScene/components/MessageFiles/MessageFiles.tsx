"use client";

import { IconFile, IconFileTypePdf, IconTable } from "@tabler/icons-react";
import Image from "next/image";
import { getViewableKind } from "@/lib/chat/attachments";
import type { ChatMessage } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";

interface MessageFilesProps {
	files: ChatMessage["files"];
	onOpen: (file: ChatMessage["files"][number]) => void;
}

export function MessageFiles({ files, onOpen }: MessageFilesProps) {
	return (
		<ul className="flex w-full max-w-80 flex-col gap-1">
			{files.map((file) => {
				const kind = getViewableKind(file.name);
				return (
					<li key={file.id}>
						<a
							href={file.url}
							download={file.name}
							aria-label={`${kind ? "Open" : "Download"} ${file.name}`}
							onClick={(event) => {
								if (!kind) return;
								if (
									event.metaKey ||
									event.ctrlKey ||
									event.shiftKey ||
									event.altKey
								) {
									return;
								}
								event.preventDefault();
								onOpen(file);
							}}
							className={cn(
								"rounded-lg border border-input bg-white/[0.03] px-3 outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring",
								!file.previewUrl && "flex items-center gap-2.5 py-2",
								file.previewUrl &&
									"grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 overflow-hidden pb-2",
							)}
						>
							{file.previewUrl && (
								<span className="relative col-span-2 -mx-3 block h-36 bg-white">
									<Image
										src={file.previewUrl}
										alt=""
										fill
										unoptimized
										loading="lazy"
										className="object-cover object-top"
									/>
								</span>
							)}
							{kind === "pdf" && (
								<IconFileTypePdf
									aria-hidden
									className="size-5 shrink-0 text-muted-foreground"
								/>
							)}
							{(kind === "xlsx" || kind === "csv") && (
								<IconTable
									aria-hidden
									className="size-5 shrink-0 text-muted-foreground"
								/>
							)}
							{!kind && (
								<IconFile
									aria-hidden
									className="size-5 shrink-0 text-muted-foreground"
								/>
							)}
							<span className="flex min-w-0 flex-col">
								<span className="truncate text-sm" title={file.name}>
									{file.name}
								</span>
								<span className="text-xs text-muted-foreground">
									{file.size < 1024 * 1024
										? `${Math.ceil(file.size / 1024)} KB`
										: `${(file.size / 1024 / 1024).toFixed(1)} MB`}
								</span>
							</span>
						</a>
					</li>
				);
			})}
		</ul>
	);
}
