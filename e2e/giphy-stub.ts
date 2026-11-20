import type { Page } from "@playwright/test";
import sharp from "sharp";

// Searching for `q` answers the GIFs `${q}1` to `${q}4`, trending answers
// `trending1` to `trending4`, and any id is answered by id. Every GIF is titled
// `Rowing GIF <id>`, and its fixed_height rendition is
// `https://media1.giphy.com/media/<id>/200.webp?cid=e2e&rid=200.webp`.
const GIFS_PER_PAGE = 4;
const FRAME_COLOURS = ["#3b82c4", "#e4572e", "#29a36a"];

/**
 * Answer every GIPHY address the page asks for with invented GIFs, so no test
 * reaches the real GIPHY; any other GIPHY host is refused. `refuseWith` makes
 * the API answer with that status. Every request the page makes to a GIPHY
 * host lands in `requests`.
 */
export async function stubGiphy({
	page,
	refuseWith,
}: {
	page: Page;
	refuseWith?: number;
}) {
	const requests: URL[] = [];
	const image = await animatedWebp();
	page.on("request", (request) => {
		const url = new URL(request.url());
		if (url.hostname.endsWith("giphy.com")) requests.push(url);
	});

	await page.route("https://*.giphy.com/**", (route) => route.abort());
	await page.route("https://api.giphy.com/**", (route) => {
		const url = new URL(route.request().url());
		if (refuseWith) {
			return route.fulfill({
				status: refuseWith,
				headers: { "access-control-allow-origin": "*" },
				json: { message: "Refused by the e2e stub" },
			});
		}
		return route.fulfill({
			headers: { "access-control-allow-origin": "*" },
			json: { data: idsFor(url).map(gif) },
		});
	});
	// `*` also matches nothing, so this covers media.giphy.com and media0 to media4.
	await page.route("https://media*.giphy.com/**", (route) =>
		route.fulfill({ contentType: "image/webp", body: image }),
	);

	return { requests };
}

function idsFor(url: URL) {
	if (url.pathname === "/v1/gifs") {
		return (url.searchParams.get("ids") ?? "").split(",").filter(Boolean);
	}
	const prefix =
		url.pathname === "/v1/gifs/search"
			? (url.searchParams.get("q") ?? "").replace(/\W/g, "")
			: "trending";
	return Array.from(
		{ length: GIFS_PER_PAGE },
		(_, index) => `${prefix}${index + 1}`,
	);
}

function gif(id: string) {
	const media = `https://media1.giphy.com/media/${id}`;
	return {
		id,
		title: `Rowing GIF ${id}`,
		images: {
			fixed_width: {
				url: `${media}/200w.gif?cid=e2e&rid=200w.gif`,
				webp: `${media}/200w.webp?cid=e2e&rid=200w.webp`,
				width: "200",
				height: "150",
			},
			fixed_height: {
				url: `${media}/200.gif?cid=e2e&rid=200.gif`,
				webp: `${media}/200.webp?cid=e2e&rid=200.webp`,
				width: "267",
				height: "200",
			},
		},
	};
}

async function animatedWebp() {
	const frames = await Promise.all(
		FRAME_COLOURS.map((background) =>
			sharp({ create: { width: 200, height: 150, channels: 3, background } })
				.png()
				.toBuffer(),
		),
	);
	return sharp(frames, { join: { animated: true } })
		.webp({ loop: 0, delay: 400 })
		.toBuffer();
}
