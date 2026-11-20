import { IconFile } from "@tabler/icons-react";
import type { ChatMessage } from "@/lib/trpc/types";

interface MessageFilesProps {
	files: ChatMessage["files"];
}

export function MessageFiles({ files }: MessageFilesProps) {
	return (
		<ul className="flex w-full max-w-80 flex-col gap-1">
			{files.map((file) => (
				<li key={file.id}>
					<a
						href={file.url}
						download={file.name}
						aria-label={`Download ${file.name}`}
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
	);
}
