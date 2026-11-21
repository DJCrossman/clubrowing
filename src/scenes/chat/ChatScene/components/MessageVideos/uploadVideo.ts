import { put } from "@vercel/blob/client";
import { blankVideoLocation } from "./blankVideoLocation";

const POSTER_MAX_WIDTH = 720;

export async function uploadVideo({
	file,
	onProgress,
}: {
	file: File;
	onProgress: (uploadedBytes: number) => void;
}) {
	const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
	// WebM is the one format passed through as it is, so it is told by its bytes, never its name.
	const prepared = [0x1a, 0x45, 0xdf, 0xa3].every(
		(byte, index) => signature[index] === byte,
	)
		? file
		: await blankVideoLocation(file).catch(() => {
				throw new Error("This video can't be prepared. Try a different file.");
			});
	const { poster, durationMs, width, height } =
		await readVideoDetails(prepared);

	const response = await fetch("/api/v1/uploads/video", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name: file.name,
			size: file.size,
			durationMs,
			width,
			height,
		}),
	}).catch(() => {
		throw new Error(
			"We couldn't upload your video. Check your connection and try again.",
		);
	});
	const permission: {
		id?: string;
		pathname?: string;
		clientToken?: string;
		contentType?: string;
		error?: string;
	} = await response.json().catch(() => ({}));
	if (
		!response.ok ||
		!permission.id ||
		!permission.pathname ||
		!permission.clientToken
	) {
		throw new Error(
			permission.error ?? "We couldn't upload your video. Try again.",
		);
	}

	await put(permission.pathname, prepared, {
		access: "private",
		token: permission.clientToken,
		contentType: permission.contentType,
		onUploadProgress: ({ loaded }) => onProgress(loaded),
	}).catch(() => {
		throw new Error(
			"We couldn't upload your video. Check your connection and try again.",
		);
	});

	if (poster) {
		const body = new FormData();
		body.append(
			"file",
			poster,
			poster.type === "image/webp" ? "poster.webp" : "poster.png",
		);
		body.append("kind", "preview");
		body.append("previewOf", permission.id);
		// The video is sent without its picture rather than not at all.
		await fetch("/api/v1/uploads", { method: "POST", body }).catch(
			() => undefined,
		);
	}
	return permission.id;
}

async function readVideoDetails(video: Blob) {
	const details: {
		poster: Blob | null;
		durationMs?: number;
		width?: number;
		height?: number;
	} = { poster: null };
	const source = URL.createObjectURL(video);
	const element = document.createElement("video");
	element.muted = true;
	element.playsInline = true;
	element.preload = "metadata";
	try {
		// The picture is a nicety: it never holds the send for more than this.
		await Promise.race([
			new Promise((resolve) => setTimeout(resolve, 5_000)),
			(async () => {
				await new Promise((resolve, reject) => {
					element.addEventListener("loadedmetadata", resolve, { once: true });
					element.addEventListener("error", reject, { once: true });
					element.src = source;
					element.load();
				});
				if (Number.isFinite(element.duration)) {
					details.durationMs = Math.round(element.duration * 1000);
				}
				if (element.videoWidth > 0 && element.videoHeight > 0) {
					details.width = element.videoWidth;
					details.height = element.videoHeight;
				}
				const hasSeeked = await new Promise<boolean>((resolve, reject) => {
					setTimeout(() => resolve(false), 2_000);
					element.addEventListener("seeked", () => resolve(true), {
						once: true,
					});
					element.addEventListener("error", reject, { once: true });
					element.currentTime = Math.min(1, element.duration / 4);
				});
				// iOS Safari withholds frames from a video that has never played.
				if (!hasSeeked) {
					await element.play();
					element.pause();
				}
				// iOS hands a canvas a black frame straight after seeking.
				if ("requestVideoFrameCallback" in element) {
					await new Promise((resolve) => {
						setTimeout(resolve, 1_000);
						element.requestVideoFrameCallback(resolve);
					});
				}
				const width = Math.min(POSTER_MAX_WIDTH, element.videoWidth);
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = Math.round(
					(element.videoHeight * width) / element.videoWidth,
				);
				canvas
					.getContext("2d")
					?.drawImage(element, 0, 0, canvas.width, canvas.height);
				details.poster = await new Promise<Blob | null>((resolve) =>
					canvas.toBlob(resolve, "image/webp", 0.8),
				);
			})().catch(() => undefined),
		]);
		return { ...details };
	} finally {
		element.removeAttribute("src");
		element.load();
		URL.revokeObjectURL(source);
	}
}
