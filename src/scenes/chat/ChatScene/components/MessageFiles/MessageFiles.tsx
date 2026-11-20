"use client";

import { IconFile } from "@tabler/icons-react";
import { useState } from "react";
import { getViewableKind } from "@/lib/chat/attachments";
import type { ChatMessage } from "@/lib/trpc/types";
import { FileViewerDialog } from "../FileViewer/FileViewerDialog";

interface MessageFilesProps {
	files: ChatMessage["files"];
}

export function MessageFiles({ files }: MessageFilesProps) {
	const [viewing, setViewing] = useState<ChatMessage["files"][number] | null>(
		null,
	);

	return (
		<>
			<ul className="flex w-full max-w-80 flex-col gap-1">
				{files.map((file) => (
					<li key={file.id}>
						<a
							href={file.url}
							download={file.name}
							aria-label={`${getViewableKind(file.name) ? "Open" : "Download"} ${file.name}`}
							onClick={(event) => {
								if (!getViewableKind(file.name)) return;
								if (
									event.metaKey ||
									event.ctrlKey ||
									event.shiftKey ||
									event.altKey
								) {
									return;
								}
								event.preventDefault();
								setViewing(file);
							}}
							className="flex items-center gap-2.5 rounded-lg border border-input bg-white/[0.03] px-3 py-2 outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-ring"
						>
							<IconFile
								aria-hidden
								className="size-5 shrink-0 text-muted-foreground"
							/>
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
				))}
			</ul>
			<FileViewerDialog file={viewing} onClose={() => setViewing(null)} />
		</>
	);
}
