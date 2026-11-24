// A video goes straight from the browser to storage, so its row is only trusted once the stored file is what the row promised.
export function storedFileMatches({
	stored,
	upload,
}: {
	stored: { size: number; contentType: string };
	upload: { size: number; contentType: string | null };
}) {
	return (
		stored.size <= upload.size && stored.contentType === upload.contentType
	);
}
