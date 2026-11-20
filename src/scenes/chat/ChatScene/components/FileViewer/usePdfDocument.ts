import {
	GlobalWorkerOptions,
	getDocument,
	type PDFDocumentLoadingTask,
	type PDFDocumentProxy,
} from "pdfjs-dist";
import { useEffect, useState } from "react";

type PdfDocumentState =
	| { status: "opening" }
	| { status: "failed" }
	| { status: "ready"; pdfDocument: PDFDocumentProxy };

// Pixels; a larger embedded image is skipped rather than decoded into gigabytes.
const MAX_IMAGE_SIZE = 25_000_000;

GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

export function usePdfDocument(url: string) {
	const [state, setState] = useState<PdfDocumentState>({ status: "opening" });

	useEffect(() => {
		let isCancelled = false;
		let loadingTask: PDFDocumentLoadingTask | null = null;

		(async () => {
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Status ${response.status}`);
				const data = new Uint8Array(await response.arrayBuffer());
				if (isCancelled) return;
				if (new TextDecoder().decode(data.subarray(0, 5)) !== "%PDF-") {
					setState({ status: "failed" });
					return;
				}
				loadingTask = getDocument({
					data,
					enableXfa: false,
					maxImageSize: MAX_IMAGE_SIZE,
				});
				const pdfDocument = await loadingTask.promise;
				if (!isCancelled) setState({ status: "ready", pdfDocument });
			} catch {
				if (!isCancelled) setState({ status: "failed" });
			}
		})();

		return () => {
			isCancelled = true;
			loadingTask?.destroy();
		};
	}, [url]);

	return state;
}
