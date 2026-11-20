"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { usePdfPage } from "./usePdfPage";

interface PdfPageProps {
	pdfDocument: PDFDocumentProxy;
	pageNumber: number;
}

export function PdfPage({ pdfDocument, pageNumber }: PdfPageProps) {
	const { containerRef, canvasRef, aspectRatio } = usePdfPage({
		pdfDocument,
		pageNumber,
	});

	return (
		<div
			ref={containerRef}
			className="relative w-full overflow-hidden rounded-sm bg-white shadow-sm"
			style={{ aspectRatio }}
		>
			<canvas
				ref={canvasRef}
				role="img"
				aria-label={`Page ${pageNumber} of ${pdfDocument.numPages}`}
				className="absolute inset-0 size-full"
			/>
		</div>
	);
}
