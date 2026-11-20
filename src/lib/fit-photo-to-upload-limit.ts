const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const JPEG_QUALITIES = [0.9, 0.85, 0.8];
// iOS Safari refuses to draw a canvas larger than about 16.7 megapixels.
const MAX_CANVAS_PIXELS = 4096 * 4096;

export async function fitPhotoToUploadLimit({
	file,
	longEdge,
}: {
	file: File;
	longEdge?: number;
}): Promise<File> {
	const bitmap = await createImageBitmap(file, {
		imageOrientation: "from-image",
	}).catch(() => {
		throw new Error(
			"That file isn't a photo we can use. Try a JPEG, PNG or WebP.",
		);
	});
	try {
		const photoLongEdge = Math.max(bitmap.width, bitmap.height);
		if (
			(!longEdge || photoLongEdge <= longEdge) &&
			file.size <= MAX_UPLOAD_BYTES &&
			["image/jpeg", "image/png", "image/webp"].includes(file.type)
		) {
			return file;
		}

		const fittedScale = Math.min(
			1,
			longEdge ? longEdge / photoLongEdge : 1,
			Math.sqrt(MAX_CANVAS_PIXELS / (bitmap.width * bitmap.height)),
		);
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error(
				"That photo is too large to prepare on this device. Try a smaller one.",
			);
		}
		const lastQuality = JPEG_QUALITIES.length - 1;
		for (let attempt = 0; ; attempt++) {
			const scale = fittedScale * 0.85 ** Math.max(0, attempt - lastQuality);
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(
					resolve,
					"image/jpeg",
					JPEG_QUALITIES[Math.min(attempt, lastQuality)],
				),
			);
			if (!blob) {
				throw new Error(
					"That photo is too large to prepare on this device. Try a smaller one.",
				);
			}
			if (blob.size <= MAX_UPLOAD_BYTES) {
				return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.jpg`, {
					type: "image/jpeg",
				});
			}
		}
	} finally {
		bitmap.close();
	}
}
