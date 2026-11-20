"use client";

import { IconDownload } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getViewableKind } from "@/lib/chat/attachments";
import type { ChatMessage } from "@/lib/trpc/types";

const PdfPages = dynamic(
	() => import("./PdfPages").then(({ PdfPages }) => PdfPages),
	{
		ssr: false,
		loading: () => <p className="text-sm text-muted-foreground">Opening…</p>,
	},
);

const SheetTable = dynamic(
	() => import("./SheetTable").then(({ SheetTable }) => SheetTable),
	{
		ssr: false,
		loading: () => <p className="text-sm text-muted-foreground">Opening…</p>,
	},
);

interface FileViewerDialogProps {
	file: ChatMessage["files"][number] | null;
	onClose: () => void;
}

export function FileViewerDialog({ file, onClose }: FileViewerDialogProps) {
	const kind = file && getViewableKind(file.name);

	return (
		<Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="flex h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl max-sm:h-[calc(100svh-2.5rem)] max-sm:overflow-hidden max-sm:pb-0">
				{file && (
					<>
						<div className="flex items-center gap-3 border-b py-3 pr-12 pl-4">
							<DialogTitle className="min-w-0 flex-1 truncate text-base">
								{file.name}
							</DialogTitle>
							<Button
								variant="outline"
								size="sm"
								render={
									<a href={file.url} download={file.name}>
										<IconDownload aria-hidden />
										Download
									</a>
								}
							/>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4 max-sm:p-2 max-sm:pb-[max(env(safe-area-inset-bottom),0.5rem)]">
							{kind === "pdf" && <PdfPages url={file.url} />}
							{(kind === "xlsx" || kind === "csv") && (
								<SheetTable url={file.url} kind={kind} />
							)}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
