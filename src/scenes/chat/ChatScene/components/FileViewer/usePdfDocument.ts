import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useState } from "react";
import { openPdf } from "./openPdf";

type PdfDocumentState =
	| { status: "opening" }
	| { status: "failed" }
	| { status: "ready"; pdfDocument: PDFDocumentProxy };

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
				loadingTask = openPdf(data);
				if (!loadingTask) {
					setState({ status: "failed" });
					return;
				}
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
