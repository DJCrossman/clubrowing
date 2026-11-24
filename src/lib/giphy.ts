import { z } from "zod";
import { envVars } from "@/lib/env";

const renditionSchema = z.object({
	url: z.string(),
	width: z.coerce.number(),
	height: z.coerce.number(),
	webp: z.string().optional(),
});
const gifsSchema = z.object({
	data: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			images: z.object({
				fixed_width: renditionSchema,
				fixed_height: renditionSchema,
			}),
		}),
	),
});

export type Gif = z.infer<typeof gifsSchema>["data"][number];

let paused = false;
const pauseListeners = new Set<() => void>();
let pendingBatch: Map<
	string,
	{ resolve: (gif: Gif | null) => void; reject: (error: unknown) => void }[]
> | null = null;

export const gifPause = {
	subscribe: (listener: () => void) => {
		pauseListeners.add(listener);
		return () => pauseListeners.delete(listener);
	},
	isPaused: () => paused,
};

export async function requestGiphy({
	path,
	params,
}: {
	path: string;
	params: Record<string, string>;
}) {
	const response = await fetch(
		`https://api.giphy.com/v1/gifs${path}?${new URLSearchParams({
			api_key: envVars.NEXT_PUBLIC_GIPHY_API_KEY ?? "",
			rating: "g",
			...params,
		})}`,
	);
	if (!response.ok) {
		// A refused call (rate limit, key, outage) would only be refused again, and the limit is hourly, so stop asking for an hour.
		paused = true;
		for (const listener of pauseListeners) listener();
		setTimeout(
			() => {
				paused = false;
				for (const listener of pauseListeners) listener();
			},
			60 * 60 * 1000,
		);
		throw new Error(`GIF request failed with status ${response.status}`);
	}
	return gifsSchema.parse(await response.json()).data;
}

// The free key allows 100 calls an hour, so every GIF that appears together is
// fetched in one request instead of one request each.
export function loadGifInBatch(id: string) {
	return new Promise<Gif | null>((resolve, reject) => {
		if (!pendingBatch || pendingBatch.size >= 100) {
			const batch: NonNullable<typeof pendingBatch> = new Map();
			pendingBatch = batch;
			setTimeout(() => {
				if (pendingBatch === batch) pendingBatch = null;
				requestGiphy({ path: "", params: { ids: [...batch.keys()].join(",") } })
					.then((gifs) => {
						for (const [batchId, waiting] of batch) {
							const gif = gifs.find((item) => item.id === batchId) ?? null;
							for (const caller of waiting) caller.resolve(gif);
						}
					})
					.catch((error) => {
						for (const waiting of batch.values()) {
							for (const caller of waiting) caller.reject(error);
						}
					});
			}, 10);
		}
		const waiting = pendingBatch.get(id) ?? [];
		waiting.push({ resolve, reject });
		pendingBatch.set(id, waiting);
	});
}
