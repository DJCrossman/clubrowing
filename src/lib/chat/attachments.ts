export function getAttachmentsPreview({
	photoCount,
	fileCount,
	fileName,
}: {
	photoCount: number;
	fileCount: number;
	fileName: string | null;
}) {
	if (photoCount + fileCount === 0) return null;
	if (fileCount === 0 && photoCount === 1) return "Photo";
	if (fileCount === 0) return `${photoCount} photos`;
	if (photoCount === 0 && fileCount === 1) return `File: ${fileName}`;
	return `${photoCount + fileCount} files`;
}

export function getViewableKind(name: string): "pdf" | "xlsx" | "csv" | null {
	const lowerCaseName = name.toLowerCase();
	if (lowerCaseName.endsWith(".pdf")) return "pdf";
	if (lowerCaseName.endsWith(".xlsx")) return "xlsx";
	if (lowerCaseName.endsWith(".csv")) return "csv";
	return null;
}
