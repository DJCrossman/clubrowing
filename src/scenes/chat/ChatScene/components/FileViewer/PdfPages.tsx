"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "./PdfPage";

const MAX_PAGES = 50;

interface PdfPagesProps {
	pdfDocument: PDFDocumentProxy | null;
	isOpening: boolean;
	isFailed: boolean;
}

export function PdfPages({ pdfDocument, isOpening, isFailed }: PdfPagesProps) {
	return (
		<>
			{isOpening && <p className="text-sm text-muted-foreground">Opening…</p>}
			{isFailed && (
				<p className="text-sm text-muted-foreground">
					This file can't be shown here. Download it to open it on your device.
				</p>
			)}
			{pdfDocument && (
				<div className="mx-auto flex max-w-3xl flex-col gap-4 max-sm:gap-2">
					{pdfDocument.numPages > MAX_PAGES && (
						<p className="text-sm text-muted-foreground">
							Showing the first {MAX_PAGES} of {pdfDocument.numPages} pages.
							Download the file to see the rest.
						</p>
					)}
					{Array.from(
						{ length: Math.min(pdfDocument.numPages, MAX_PAGES) },
						(_, index) => index + 1,
					).map((pageNumber) => (
						<PdfPage
							key={pageNumber}
							pdfDocument={pdfDocument}
							pageNumber={pageNumber}
						/>
					))}
				</div>
			)}
		</>
	);
}
