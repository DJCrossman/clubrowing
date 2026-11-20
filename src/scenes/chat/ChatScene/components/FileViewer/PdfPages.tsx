"use client";

import { PdfPage } from "./PdfPage";
import { usePdfDocument } from "./usePdfDocument";

const MAX_PAGES = 50;

export function PdfPages({ url }: { url: string }) {
	const pdf = usePdfDocument(url);

	return (
		<>
			{pdf.status === "opening" && (
				<p className="text-sm text-muted-foreground">Opening…</p>
			)}
			{pdf.status === "failed" && (
				<p className="text-sm text-muted-foreground">
					This file can't be shown here. Download it to open it on your device.
				</p>
			)}
			{pdf.status === "ready" && (
				<div className="mx-auto flex max-w-3xl flex-col gap-4 max-sm:gap-2">
					{pdf.pdfDocument.numPages > MAX_PAGES && (
						<p className="text-sm text-muted-foreground">
							Showing the first {MAX_PAGES} of {pdf.pdfDocument.numPages} pages.
							Download the file to see the rest.
						</p>
					)}
					{Array.from(
						{ length: Math.min(pdf.pdfDocument.numPages, MAX_PAGES) },
						(_, index) => index + 1,
					).map((pageNumber) => (
						<PdfPage
							key={pageNumber}
							pdfDocument={pdf.pdfDocument}
							pageNumber={pageNumber}
						/>
					))}
				</div>
			)}
		</>
	);
}
