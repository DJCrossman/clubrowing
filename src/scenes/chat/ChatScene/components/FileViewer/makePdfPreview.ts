import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import { openPdf } from "./openPdf";

const PREVIEW_WIDTH = 720;
// Browsers refuse a larger canvas (iOS draws it blank), so a tall page is drawn smaller.
const MAX_CANVAS_PIXELS = 16_777_216;
const JPEG_QUALITY = 0.85;
const TIME_LIMIT_MS = 5000;

export async function makePdfPreview(file: File): Promise<Blob | null> {
	let loadingTask: PDFDocumentLoadingTask | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		loadingTask = openPdf(new Uint8Array(await file.arrayBuffer()));
		if (!loadingTask) return null;
		return await Promise.race([
			drawFirstPage(loadingTask),
			new Promise<null>((resolve) => {
				timer = setTimeout(() => resolve(null), TIME_LIMIT_MS);
			}),
		]);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		loadingTask?.destroy();
	}
}

async function drawFirstPage(loadingTask: PDFDocumentLoadingTask) {
	const page = await (await loadingTask.promise).getPage(1);
	const { width, height } = page.getViewport({ scale: 1 });
	const viewport = page.getViewport({
		scale: Math.min(
			PREVIEW_WIDTH / width,
			Math.sqrt(MAX_CANVAS_PIXELS / (width * height)),
		),
	});
	const canvas = document.createElement("canvas");
	canvas.width = Math.floor(viewport.width);
	canvas.height = Math.floor(viewport.height);
	await page.render({ canvas, viewport }).promise;
	const picture = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
	);
	canvas.width = 0;
	canvas.height = 0;
	return picture;
}
