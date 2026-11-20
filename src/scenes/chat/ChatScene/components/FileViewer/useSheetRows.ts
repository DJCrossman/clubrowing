import { useEffect, useState } from "react";
import type { SheetReply, SheetRequest } from "./sheet.worker";

type SheetRowsState = { status: "opening" } | SheetReply;

const WORKER_TIME_LIMIT_MS = 5000;

export function useSheetRows({
	url,
	kind,
}: {
	url: string;
	kind: SheetRequest["kind"];
}) {
	const [state, setState] = useState<SheetRowsState>({ status: "opening" });

	useEffect(() => {
		let isCancelled = false;
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const worker = new Worker(new URL("./sheet.worker.ts", import.meta.url), {
			type: "module",
		});
		const settle = (next: SheetReply) => {
			clearTimeout(timeout);
			worker.terminate();
			if (!isCancelled) setState(next);
		};
		worker.addEventListener("message", (event: MessageEvent<SheetReply>) =>
			settle(event.data),
		);
		worker.addEventListener("error", () => settle({ status: "failed" }));
		worker.addEventListener("messageerror", () => settle({ status: "failed" }));

		(async () => {
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Status ${response.status}`);
				const bytes = await response.arrayBuffer();
				if (isCancelled) return;
				timeout = setTimeout(
					() => settle({ status: "failed" }),
					WORKER_TIME_LIMIT_MS,
				);
				worker.postMessage({ kind, bytes } satisfies SheetRequest, [bytes]);
			} catch {
				settle({ status: "failed" });
			}
		})();

		return () => {
			isCancelled = true;
			clearTimeout(timeout);
			worker.terminate();
		};
	}, [url, kind]);

	return state;
}
