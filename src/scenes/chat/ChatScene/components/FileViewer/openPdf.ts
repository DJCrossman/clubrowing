import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

// Pixels; a larger embedded image is skipped rather than decoded into gigabytes.
const MAX_IMAGE_SIZE = 25_000_000;

GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

export function openPdf(data: Uint8Array) {
	if (new TextDecoder().decode(data.subarray(0, 5)) !== "%PDF-") return null;
	return getDocument({
		data,
		enableXfa: false,
		maxImageSize: MAX_IMAGE_SIZE,
	});
}
