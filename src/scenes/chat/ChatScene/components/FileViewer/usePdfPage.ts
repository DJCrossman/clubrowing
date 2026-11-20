import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

// Space is held at this shape until the page's own size is known.
const LETTER_ASPECT_RATIO = 8.5 / 11;
// Browsers refuse a larger canvas (iOS draws it blank), so a tall page is drawn smaller.
const MAX_CANVAS_PIXELS = 16_777_216;

export function usePdfPage({
	pdfDocument,
	pageNumber,
}: {
	pdfDocument: PDFDocumentProxy;
	pageNumber: number;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [page, setPage] = useState<PDFPageProxy | null>(null);

	useEffect(() => {
		let isCancelled = false;
		pdfDocument
			.getPage(pageNumber)
			.then((loaded) => {
				if (!isCancelled) setPage(loaded);
			})
			.catch(() => {});
		return () => {
			isCancelled = true;
		};
	}, [pdfDocument, pageNumber]);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!page || !container || !canvas) return;
		let renderTask: RenderTask | null = null;

		// A page is drawn only while it is on screen, and its canvas is freed
		// when it leaves, so a long PDF never holds every page in memory.
		const observer = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting) {
				renderTask?.cancel();
				renderTask = null;
				canvas.width = 0;
				canvas.height = 0;
				return;
			}
			if (renderTask) return;
			const { width, height } = page.getViewport({ scale: 1 });
			const viewport = page.getViewport({
				scale: Math.min(
					(container.clientWidth * Math.min(devicePixelRatio, 2)) / width,
					Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
				),
			});
			canvas.width = Math.floor(viewport.width);
			canvas.height = Math.floor(viewport.height);
			renderTask = page.render({ canvas, viewport });
			renderTask.promise.catch(() => {});
		});
		observer.observe(container);

		return () => {
			observer.disconnect();
			renderTask?.cancel();
			canvas.width = 0;
			canvas.height = 0;
		};
	}, [page]);

	return {
		containerRef,
		canvasRef,
		aspectRatio: page
			? page.getViewport({ scale: 1 }).width /
				page.getViewport({ scale: 1 }).height
			: LETTER_ASPECT_RATIO,
	};
}
