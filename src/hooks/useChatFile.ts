"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getViewableKind } from "@/lib/chat/attachments";
import type { ChatMessage, ChatThread } from "@/lib/trpc/types";
import type {
	SheetReply,
	SheetRequest,
} from "@/scenes/chat/ChatScene/components/FileViewer/sheet.worker";

const WORKER_TIME_LIMIT_MS = 5000;

export function useChatFile({
	messages,
	thread,
	threadMessageId,
}: {
	messages: ChatMessage[];
	thread: ChatThread | undefined;
	threadMessageId: string | null;
}) {
	const [viewing, setViewing] = useState<{
		fileId: string;
		threadMessageId: string | null;
	} | null>(null);
	// A file opened from a thread closes with the thread, however it closes.
	if (viewing?.threadMessageId && viewing.threadMessageId !== threadMessageId) {
		setViewing(null);
	}
	const file =
		[...messages, ...(thread ? [thread.root, ...thread.replies] : [])]
			.flatMap((message) => message.files)
			.find((file) => file.id === viewing?.fileId) ?? null;
	const url = file?.url ?? null;
	const kind = file && getViewableKind(file.name);
	const query = useQuery({
		queryKey: ["chatFile", url, kind],
		queryFn:
			url && kind
				? ({ signal }) => openChatFile({ url, kind, signal })
				: skipToken,
		staleTime: Infinity,
		gcTime: 0,
		retry: false,
		networkMode: "always",
	});
	const pdfDocument = query.data?.pdfDocument ?? null;

	useEffect(() => {
		return () => {
			pdfDocument?.loadingTask.destroy();
		};
	}, [pdfDocument]);

	return {
		file,
		isOpening: query.isLoading,
		isFailed: query.isError,
		pdfDocument,
		sheet: query.data?.sheet ?? null,
		openChannelFile: (file: ChatMessage["files"][number]) =>
			setViewing({ fileId: file.id, threadMessageId: null }),
		openThreadFile: (file: ChatMessage["files"][number]) =>
			setViewing({ fileId: file.id, threadMessageId }),
		closeFile: () => setViewing(null),
	};
}

async function openChatFile({
	url,
	kind,
	signal,
}: {
	url: string;
	kind: "pdf" | SheetRequest["kind"];
	signal: AbortSignal;
}) {
	if (kind === "pdf") {
		const { openPdf } = await import(
			"@/scenes/chat/ChatScene/components/FileViewer/openPdf"
		);
		const response = await fetch(url);
		if (!response.ok) throw new Error(`Status ${response.status}`);
		const data = new Uint8Array(await response.arrayBuffer());
		signal.throwIfAborted();
		const loadingTask = openPdf(data);
		if (!loadingTask) throw new Error("Not a PDF");
		signal.addEventListener("abort", () => loadingTask.destroy());
		return { pdfDocument: await loadingTask.promise, sheet: null };
	}

	const worker = new Worker(
		new URL(
			"../scenes/chat/ChatScene/components/FileViewer/sheet.worker.ts",
			import.meta.url,
		),
		{ type: "module" },
	);
	signal.addEventListener("abort", () => worker.terminate());
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		const reply = await new Promise<SheetReply>((resolve) => {
			worker.addEventListener("message", (event: MessageEvent<SheetReply>) =>
				resolve(event.data),
			);
			worker.addEventListener("error", () => resolve({ status: "failed" }));
			worker.addEventListener("messageerror", () =>
				resolve({ status: "failed" }),
			);
			fetch(url)
				.then((response) => {
					if (!response.ok) throw new Error(`Status ${response.status}`);
					return response.arrayBuffer();
				})
				.then((bytes) => {
					timeout = setTimeout(
						() => resolve({ status: "failed" }),
						WORKER_TIME_LIMIT_MS,
					);
					worker.postMessage({ kind, bytes } satisfies SheetRequest, [bytes]);
				})
				.catch(() => resolve({ status: "failed" }));
		});
		if (reply.status === "failed") throw new Error("The sheet can't be read");
		return { pdfDocument: null, sheet: reply };
	} finally {
		clearTimeout(timeout);
		worker.terminate();
	}
}
