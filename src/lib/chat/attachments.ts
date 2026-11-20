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
