import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import {
	type Browser,
	expect,
	type Locator,
	type Page,
	test,
} from "@playwright/test";
import sharp from "sharp";
import { stubGiphy } from "./giphy-stub";
import { signInAs } from "./sign-in";

test(
	"a member edits their own message in the composer, which takes no files, and it is tagged as edited",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		// ArrowUp opens the member's newest editable message and every test posts as
		// that member, so this edits in a DM that no other test writes to.
		const [{ result: members }] = await (
			await page.request.get("/api/v1/trpc/chat.getMembers?batch=1&input={}")
		).json();
		const [{ result: dm }] = await (
			await page.request.post("/api/v1/trpc/chat.startDm?batch=1", {
				data: {
					0: {
						userIds: [
							members.data.data.find(
								(person: { name: string }) => person.name === "Quinn Portside",
							).id,
						],
					},
				},
			})
		).json();
		await page.goto(`/chat/${dm.data.channelId}`);

		const original = `Boat bay opens at 6:15 ${Date.now()}`;
		const corrected = original.replace("6:15", "6:30");
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await composer.fill(original);
		await composer.press("Enter");
		const message = page.getByRole("article").filter({ hasText: original });
		await expect(message).toBeVisible();
		await expect(message.getByText("(edited)")).toHaveCount(0);

		await composer.fill("Half-typed draft");
		await message.click();
		await message.getByRole("button", { name: "More actions" }).click();
		await page.getByRole("menuitem", { name: "Edit message" }).click();
		const editor = page.getByRole("textbox", { name: "Edit message" });
		await expect(page.getByText("Editing message")).toBeVisible();
		await expect(editor).toBeFocused();
		await expect(editor).toHaveValue(original);

		const files = [
			{
				name: "trailer.jpg",
				mimeType: "image/jpeg",
				buffer: await photo({ width: 900, height: 600 }),
			},
		];
		const dataTransfer = await fileTransfer({ page, files });
		const overlay = page.getByText("Drop files to add them to your message");
		await editor.dispatchEvent("dragenter", { dataTransfer });
		await editor.dispatchEvent("dragover", { dataTransfer });
		await expect(overlay).toHaveCount(0);
		expect(
			await editor.evaluate(
				(element, clipboardData) => {
					clipboardData.setData("text/plain", "trailer.jpg");
					return element.dispatchEvent(
						new ClipboardEvent("paste", {
							clipboardData,
							bubbles: true,
							cancelable: true,
						}),
					);
				},
				await fileTransfer({ page, files }),
			),
			"the paste is left to the browser",
		).toBe(true);
		await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);

		await editor.fill(corrected);
		await editor.press("Enter");

		await expect(
			page
				.getByRole("article")
				.filter({ hasText: corrected })
				.getByText("(edited)"),
		).toBeVisible();
		await expect(page.getByText(original)).toHaveCount(0);
		await expect(composer).toHaveValue("Half-typed draft");

		await composer.fill("");
		await composer.press("ArrowUp");
		await expect(editor).toHaveValue(corrected);
		await editor.press("Escape");
		await expect(page.getByText("Editing message")).toHaveCount(0);
		await expect(composer).toHaveValue("");
		await composer.dispatchEvent("dragenter", { dataTransfer });
		await expect(overlay).toBeVisible();
	},
);

test(
	"a member finds a GIF and sends it, and someone else sees it",
	{ tag: "@desktop" },
	async ({ page, browser }) => {
		const { requests } = await stubGiphy({ page });
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const query = `regatta${test.info().project.name}${Date.now()}`;
		const id = `${query}1`;
		const src = `https://media1.giphy.com/media/${id}/200.webp?cid=e2e&rid=200.webp`;
		await page.getByRole("button", { name: "Add a GIF" }).click();
		await expect(
			page.getByRole("button", { name: "Send GIF: Rowing GIF trending1" }),
		).toBeVisible();
		await expect(page.getByText("Powered by GIPHY")).toBeVisible();
		await page.getByPlaceholder("Search GIFs").fill(query);
		await expect(
			page.getByRole("button", { name: "Send GIF: Rowing GIF trending1" }),
		).toHaveCount(0);
		await page
			.getByRole("button", { name: `Send GIF: Rowing GIF ${id}`, exact: true })
			.click();
		await expect(page.getByText("Powered by GIPHY")).toHaveCount(0);

		const image = page
			.getByRole("article")
			.getByRole("img", { name: `Rowing GIF ${id}`, exact: true });
		await expect(image).toHaveAttribute("src", src);
		await expect
			.poll(() =>
				image.evaluate((element: HTMLImageElement) => element.naturalWidth),
			)
			.toBeGreaterThan(0);
		const apiRequests = requests.filter(
			(url) => url.hostname === "api.giphy.com",
		);
		expect(apiRequests.length).toBeGreaterThan(0);
		for (const url of apiRequests) {
			expect(url.searchParams.get("rating")).toBe("g");
		}
		expect(
			apiRequests.filter(
				(url) =>
					url.pathname === "/v1/gifs" &&
					url.searchParams.get("ids")?.split(",").includes(id),
			),
		).toHaveLength(0);

		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();
		const { requests: adminRequests } = await stubGiphy({ page: adminPage });
		await signInAs(adminPage, "admin");
		await adminPage.goto("/chat/everyone");
		await expect(
			adminPage
				.getByRole("article")
				.getByRole("img", { name: `Rowing GIF ${id}`, exact: true }),
		).toHaveAttribute("src", src);
		expect(
			adminRequests.filter(
				(url) =>
					url.hostname === "api.giphy.com" &&
					url.pathname === "/v1/gifs" &&
					url.searchParams.get("ids")?.split(",").includes(id),
			),
		).toHaveLength(1);
		await adminContext.close();
	},
);

test(
	"when the provider refuses, GIFs pause",
	{ tag: "@phone" },
	async ({ page }) => {
		await stubGiphy({ page, refuseWith: 429 });
		await signInAs(page, "member");
		const id = `headwind${test.info().project.name}${Date.now()}`;
		const title = `Rowing GIF ${id}`;
		expect(
			(
				await page.request.post("/api/v1/trpc/chat.sendMessage?batch=1", {
					data: { 0: { channelId: "everyone", gif: { id, title } } },
				})
			).ok(),
		).toBeTruthy();
		await page.goto("/chat/everyone");

		await expect(
			page.getByRole("article").getByText(`GIF: ${title}`, { exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: "GIFs are taking a break. Try again later.",
			}),
		).toBeDisabled();
		await expect(page.getByRole("button", { name: "Add a GIF" })).toHaveCount(
			0,
		);
	},
);

test(
	"a member under 13 has no GIF button and reads GIFs as text",
	{ tag: "@phone" },
	async ({ page, browser }) => {
		const id = `puddle${test.info().project.name}${Date.now()}`;
		const title = `Rowing GIF ${id}`;
		const memberContext = await browser.newContext();
		await signInAs(await memberContext.newPage(), "member");
		expect(
			(
				await memberContext.request.post(
					"/api/v1/trpc/chat.sendMessage?batch=1",
					{
						data: { 0: { channelId: "everyone", gif: { id, title } } },
					},
				)
			).ok(),
		).toBeTruthy();
		await memberContext.close();

		const { requests } = await stubGiphy({ page });
		await signInAs(page, "junior");
		await page.goto("/chat/everyone");
		await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();
		await expect(
			page.getByRole("article").getByText(`GIF: ${title}`, { exact: true }),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Add a GIF" })).toHaveCount(
			0,
		);
		await expect(
			page.getByRole("button", {
				name: "GIFs are taking a break. Try again later.",
			}),
		).toHaveCount(0);
		expect(requests).toHaveLength(0);
	},
);

test(
	"on a phone the GIF picker stays above the keyboard and drops back when it closes",
	{ tag: "@phone" },
	async ({ page }) => {
		await stubGiphy({ page });
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		await page.getByRole("button", { name: "Add a GIF" }).tap();
		await expect(
			page.getByRole("button", { name: "Send GIF: Rowing GIF trending1" }),
		).toBeVisible();
		const search = page.getByPlaceholder("Search GIFs");
		const credit = page.getByText("Powered by GIPHY");
		await search.tap();

		// Headless Chromium has no on-screen keyboard, so report the shorter visual
		// viewport that a 336 px one leaves behind.
		const keyboardTop = await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return window.innerHeight;
			const height = window.innerHeight - 336;
			Object.defineProperty(viewport, "height", {
				configurable: true,
				get: () => height,
			});
			viewport.dispatchEvent(new Event("resize"));
			return height;
		});
		await expect
			.poll(() =>
				credit.evaluate((element) => element.getBoundingClientRect().bottom),
			)
			.toBeLessThanOrEqual(keyboardTop);
		expect(
			await search.evaluate((element) => element.getBoundingClientRect().top),
		).toBeGreaterThanOrEqual(0);

		await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return;
			Object.defineProperty(viewport, "height", {
				get: () => window.innerHeight,
			});
			viewport.dispatchEvent(new Event("resize"));
		});
		await expect
			.poll(() =>
				credit.evaluate((element) => element.getBoundingClientRect().bottom),
			)
			.toBeGreaterThan(keyboardTop);
	},
);

test(
	"on a phone the emoji picker stays above the keyboard and drops back when it closes",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		await page.getByRole("button", { name: "Add emoji" }).tap();
		const search = page.getByPlaceholder("Search all emoji");
		const picker = page.getByRole("dialog").filter({ has: search });
		await expect(picker).toBeVisible();
		await search.tap();

		// Headless Chromium has no on-screen keyboard, so report the shorter visual
		// viewport that a 336 px one leaves behind.
		const keyboardTop = await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return window.innerHeight;
			const height = window.innerHeight - 336;
			Object.defineProperty(viewport, "height", {
				configurable: true,
				get: () => height,
			});
			viewport.dispatchEvent(new Event("resize"));
			return height;
		});
		await expect
			.poll(() =>
				picker.evaluate((element) => element.getBoundingClientRect().bottom),
			)
			.toBeLessThanOrEqual(keyboardTop);
		expect(
			await search.evaluate((element) => element.getBoundingClientRect().top),
		).toBeGreaterThanOrEqual(0);

		await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return;
			Object.defineProperty(viewport, "height", {
				get: () => window.innerHeight,
			});
			viewport.dispatchEvent(new Event("resize"));
		});
		await expect
			.poll(() =>
				picker.evaluate((element) => element.getBoundingClientRect().bottom),
			)
			.toBeGreaterThan(keyboardTop);
	},
);

test(
	"on a phone the text bar sits on the keyboard and the pickers open above it",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		const textbox = page.getByRole("textbox", { name: /^Message/ });
		const send = page.getByRole("button", { name: "Send message" });
		const newest = page.getByRole("article").last();
		await expect(newest).toBeVisible();
		await textbox.tap();

		// Headless Chromium has no on-screen keyboard, so report the shorter visual
		// viewport that a 336 px one leaves behind.
		const keyboardTop = await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return window.innerHeight;
			const height = window.innerHeight - 336;
			Object.defineProperty(viewport, "height", {
				configurable: true,
				get: () => height,
			});
			viewport.dispatchEvent(new Event("resize"));
			return height;
		});
		await expect
			.poll(() =>
				send.evaluate((element) => element.getBoundingClientRect().bottom),
			)
			.toBeLessThanOrEqual(keyboardTop);
		await expect
			.poll(async () => {
				const newestBottom = await newest.evaluate(
					(element) => element.getBoundingClientRect().bottom,
				);
				const textboxTop = await textbox.evaluate(
					(element) => element.getBoundingClientRect().top,
				);
				return newestBottom > 0 && newestBottom <= textboxTop;
			})
			.toBe(true);

		await page.getByRole("button", { name: "Add emoji" }).tap();
		const search = page.getByPlaceholder("Search all emoji");
		const picker = page.getByRole("dialog").filter({ has: search });
		await expect(picker).toBeVisible();
		await expect
			.poll(async () => {
				const pickerBottom = await picker.evaluate(
					(element) => element.getBoundingClientRect().bottom,
				);
				const textboxTop = await textbox.evaluate(
					(element) => element.getBoundingClientRect().top,
				);
				return pickerBottom - textboxTop;
			})
			.toBeLessThanOrEqual(0);

		await page.keyboard.press("Escape");
		await expect(picker).toHaveCount(0);
		await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return;
			Object.defineProperty(viewport, "height", {
				get: () => window.innerHeight,
			});
			viewport.dispatchEvent(new Event("resize"));
		});
		await expect
			.poll(() =>
				send.evaluate((element) => element.getBoundingClientRect().bottom),
			)
			.toBeGreaterThan(keyboardTop);
	},
);

test("a member sends a photo with a caption and everyone in the conversation sees it", async ({
	page,
	browser,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Sunrise on the river ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "sunrise.jpg",
		mimeType: "image/jpeg",
		buffer: await photo({ width: 1200, height: 800 }),
	});
	await expect(page.getByRole("img", { name: "sunrise.jpg" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Remove sunrise.jpg" }),
	).toBeVisible();
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	const message = page.getByRole("article").filter({ hasText: caption });
	const tile = message.getByRole("button", { name: "View photo" });
	await expect(tile).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Remove sunrise.jpg" }),
	).toHaveCount(0);
	const image = tile.getByRole("img", { name: "Photo from Morgan Oarsby" });
	await expect
		.poll(() =>
			image.evaluate((element: HTMLImageElement) => element.naturalWidth),
		)
		.toBeGreaterThan(0);

	await tile.click();
	const viewer = page.getByRole("dialog", { name: "Photo" });
	await expect(
		viewer.getByRole("img", { name: "Photo from Morgan Oarsby" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(viewer).toHaveCount(0);

	const adminContext = await browser.newContext();
	const adminPage = await adminContext.newPage();
	await signInAs(adminPage, "admin");
	await adminPage.goto("/chat/everyone");
	const adminImage = adminPage
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("img", { name: "Photo from Morgan Oarsby" });
	await expect(adminImage).toBeVisible();
	await expect
		.poll(() =>
			adminImage.evaluate((element: HTMLImageElement) => element.naturalWidth),
		)
		.toBeGreaterThan(0);
	await adminContext.close();
});

test(
	"a photo over the size limits is made smaller and still sends",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();

		const caption = `The whole crew ${test.info().project.name} ${Date.now()}`;
		const original = await photo({ width: 3600, height: 2400, isGrainy: true });
		expect(original.length).toBeGreaterThan(4 * 1024 * 1024);
		await page.locator('input[type="file"]').setInputFiles({
			name: "crew.jpg",
			mimeType: "image/jpeg",
			buffer: original,
		});
		await page.getByRole("textbox", { name: /^Message/ }).fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const image = page
			.getByRole("article")
			.filter({ hasText: caption })
			.getByRole("img", { name: "Photo from Morgan Oarsby" });
		await expect(image).toBeVisible();
		const tileUrl = (await image.getAttribute("src")) ?? "";
		const stored = await page.request.get(tileUrl.split("?")[0]);
		expect(stored.status()).toBe(200);
		const { width = 0, height = 0 } = await sharp(
			await stored.body(),
		).metadata();
		expect(Math.max(width, height)).toBeLessThanOrEqual(2560);
		const tile = await page.request.get(tileUrl);
		expect(tile.status()).toBe(200);
		const { width: tileWidth = 0, height: tileHeight = 0 } = await sharp(
			await tile.body(),
		).metadata();
		expect(Math.max(tileWidth, tileHeight)).toBeLessThanOrEqual(720);
	},
);

test(
	"someone who cannot read a conversation cannot load its photos, files or PDF first pages",
	{ tag: "@desktop" },
	async ({ page, browser }) => {
		await signInAs(page, "admin");
		const [{ result }] = await (
			await page.request.get("/api/v1/trpc/chat.getChannels?batch=1&input={}")
		).json();
		const masters = result.data.data.find(
			(channel: { name: string }) => channel.name === "Masters Squad",
		);
		const photoUpload = await page.request.post("/api/v1/uploads", {
			multipart: {
				file: {
					name: "lineup.jpg",
					mimeType: "image/jpeg",
					buffer: await photo({ width: 900, height: 600 }),
				},
			},
		});
		expect(photoUpload.status()).toBe(200);
		const { id: photoId } = await photoUpload.json();
		const [fileId, pdfId] = await Promise.all(
			[
				{
					name: "lineup.csv",
					mimeType: "text/csv",
					buffer: Buffer.from("seat,name\nstroke,Avery Coxwell\n"),
				},
				{
					name: "masters-seating.pdf",
					mimeType: "application/pdf",
					buffer: pdf("Masters seating"),
				},
			].map(async (file) => {
				const upload = await page.request.post("/api/v1/uploads", {
					multipart: { kind: "file", file },
				});
				expect(upload.status(), file.name).toBe(200);
				return (await upload.json()).id;
			}),
		);
		const preview = await page.request.post("/api/v1/uploads", {
			multipart: {
				kind: "preview",
				previewOf: pdfId,
				file: {
					name: "preview.jpg",
					mimeType: "image/jpeg",
					buffer: await photo({ width: 300, height: 400 }),
				},
			},
		});
		expect(preview.status()).toBe(200);
		const { id: previewId } = await preview.json();
		expect(
			(
				await page.request.post("/api/v1/trpc/chat.sendMessage?batch=1", {
					data: {
						0: {
							channelId: masters.id,
							attachmentIds: [photoId, fileId, pdfId],
						},
					},
				})
			).ok(),
		).toBeTruthy();

		const photoUrl = `/api/v1/chat/attachments/${photoId}?size=thumbnail`;
		const fileUrl = `/api/v1/chat/attachments/${fileId}`;
		const previewUrl = `/api/v1/chat/attachments/${previewId}`;
		for (const url of [photoUrl, previewUrl]) {
			const response = await page.request.get(url);
			expect(response.status(), url).toBe(200);
			expect(response.headers()["content-type"], url).toMatch(/^image\//);
		}
		expect((await page.request.get(fileUrl)).status()).toBe(200);

		const memberContext = await browser.newContext();
		await signInAs(await memberContext.newPage(), "member");
		for (const url of [
			photoUrl,
			`/api/v1/chat/attachments/${photoId}`,
			fileUrl,
			previewUrl,
		]) {
			expect((await memberContext.request.get(url)).status(), url).toBe(404);
		}
		await memberContext.close();

		const signedOutContext = await browser.newContext();
		for (const url of [photoUrl, fileUrl, previewUrl]) {
			expect((await signedOutContext.request.get(url)).status(), url).toBe(401);
		}
		await signedOutContext.close();
	},
);

test("deleting a message removes its photo", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Wrong photo ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles([
		{
			name: "blurry.jpg",
			mimeType: "image/jpeg",
			buffer: await photo({ width: 900, height: 600 }),
		},
		{
			name: "wrong-plan.pdf",
			mimeType: "application/pdf",
			buffer: pdf("Wrong plan"),
		},
	]);
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();
	const message = page.getByRole("article").filter({ hasText: caption });
	const src =
		(await message
			.getByRole("img", { name: "Photo from Morgan Oarsby" })
			.getAttribute("src")) ?? "";
	const fileUrl =
		(await message
			.getByRole("link", { name: "Open wrong-plan.pdf" })
			.getAttribute("href")) ?? "";
	expect((await page.request.get(src)).status()).toBe(200);
	expect((await page.request.get(fileUrl)).status()).toBe(200);

	await message.getByText(caption).click();
	await message.getByRole("button", { name: "More actions" }).click();
	await page.getByRole("menuitem", { name: "Delete message" }).click();
	await page
		.getByRole("dialog", { name: "Delete message?" })
		.getByRole("button", { name: "Delete" })
		.click();
	await expect(page.getByText(caption)).toHaveCount(0);

	expect((await page.request.get(src)).status()).toBe(404);
	expect((await page.request.get(fileUrl)).status()).toBe(404);
});

test(
	"a video over 20 MB, a file over 4 MB or more than four photos explain the limit until one is removed",
	{ tag: "@phone" },
	async ({ page }) => {
		const uploads: string[] = [];
		page.on("request", (request) => {
			if (request.url().includes("/api/v1/uploads"))
				uploads.push(request.url());
		});
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();

		// Files this big are made in the page rather than sent to it.
		await page
			.locator('input[type="file"]')
			.evaluate((input: HTMLInputElement) => {
				const transfer = new DataTransfer();
				transfer.items.add(
					new File([new Uint8Array(20 * 1024 * 1024 + 1)], "whole-race.mp4", {
						type: "video/mp4",
					}),
				);
				input.files = transfer.files;
				input.dispatchEvent(new Event("change", { bubbles: true }));
			});
		await expect(page.getByText("Videos can be up to 20 MB")).toBeVisible();
		await page.getByRole("button", { name: "Send message" }).click();
		await expect(page.getByText("Videos can be up to 20 MB")).toBeVisible();
		expect(uploads).toEqual([]);
		await page.getByRole("button", { name: "Remove whole-race.mp4" }).click();
		await expect(page.getByText("Videos can be up to 20 MB")).toHaveCount(0);

		await page
			.locator('input[type="file"]')
			.evaluate((input: HTMLInputElement) => {
				const transfer = new DataTransfer();
				transfer.items.add(
					new File(["a".repeat(4 * 1024 * 1024 + 1)], "erg-export.csv", {
						type: "text/csv",
					}),
				);
				input.files = transfer.files;
				input.dispatchEvent(new Event("change", { bubbles: true }));
			});
		await expect(page.getByText("Files can be up to 4 MB")).toBeVisible();
		await page.getByRole("button", { name: "Remove erg-export.csv" }).click();
		await expect(page.getByText("Files can be up to 4 MB")).toHaveCount(0);

		const buffer = await photo({ width: 300, height: 200 });
		await page.locator('input[type="file"]').setInputFiles(
			[1, 2, 3, 4, 5].map((number) => ({
				name: `photo-${number}.jpg`,
				mimeType: "image/jpeg",
				buffer,
			})),
		);
		await expect(
			page.getByText("A message can carry up to 4 files"),
		).toBeVisible();

		await page.getByRole("button", { name: "Remove photo-5.jpg" }).click();
		await expect(
			page.getByText("A message can carry up to 4 files"),
		).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: /^Remove photo-/ }),
		).toHaveCount(4);
	},
);

test(
	"a member sends a PDF with a caption and the other person downloads it unchanged",
	{ tag: "@desktop" },
	async ({ page, browser }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const caption = `Race plan ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		const racePlan = pdf(caption);
		await page.locator('input[type="file"]').setInputFiles({
			name: "race-plan.pdf",
			mimeType: "application/pdf",
			buffer: racePlan,
		});
		await expect(page.getByText("race-plan.pdf")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Remove race-plan.pdf" }),
		).toBeVisible();
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const chip = page
			.getByRole("article")
			.filter({ hasText: caption })
			.getByRole("link", { name: "Open race-plan.pdf" });
		await expect(chip).toBeVisible();
		await expect(chip).toHaveAttribute("download");
		await expect(chip.locator("img")).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: "Remove race-plan.pdf" }),
		).toHaveCount(0);

		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();
		await signInAs(adminPage, "admin");
		await adminPage.goto("/chat/everyone");
		const adminChip = adminPage
			.getByRole("article")
			.filter({ hasText: caption })
			.getByRole("link", { name: "Open race-plan.pdf" });
		await expect(adminChip).toBeVisible();
		await adminChip.click();
		const viewer = adminPage.getByRole("dialog", { name: "race-plan.pdf" });
		await expect(
			viewer.getByText(
				"This file can't be shown here. Download it to open it on your device.",
			),
		).toBeVisible();
		const download = viewer.getByRole("button", { name: "Download" });
		const response = await adminPage.request.get(
			(await download.getAttribute("href")) ?? "",
		);
		expect(response.status()).toBe(200);
		expect(response.headers()["content-disposition"]).toMatch(/^attachment/);
		expect(response.headers()["content-disposition"]).toContain(
			"race-plan.pdf",
		);
		expect(response.headers()["content-type"]).toBe("application/octet-stream");
		expect(response.headers()["x-content-type-options"]).toBe("nosniff");
		expect(response.headers()["content-security-policy"]).toBe("sandbox");
		expect((await response.body()).equals(racePlan)).toBe(true);
		const [downloaded] = await Promise.all([
			adminPage.waitForEvent("download"),
			download.click(),
		]);
		expect(downloaded.suggestedFilename()).toBe("race-plan.pdf");
		await adminContext.close();
	},
);

test("a PDF in a message shows its first page, and opening it downloads the PDF engine and draws its pages", async ({
	page,
	browser,
}) => {
	const requested: string[] = [];
	page.on("request", (request) => requested.push(request.url()));
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Crew notes ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "crew-notes.pdf",
		mimeType: "application/pdf",
		buffer: await printedPdf(browser),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();
	const chip = page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open crew-notes.pdf" });
	await expect(chip).toBeVisible();
	requested.length = 0;
	await page.reload();
	await expect(chip.locator("img")).toBeVisible();
	await expectFirstPageShown(chip);
	expect(requested.filter((url) => url.includes("pdf.worker"))).toEqual([]);
	// pdfjs names itself globalThis.pdfjsLib.
	expect(await hasDownloaded({ page, requested, code: "pdfjsLib" })).toBe(
		false,
	);

	await chip.click();
	const viewer = page.getByRole("dialog", { name: "crew-notes.pdf" });
	await expect(viewer.getByText("crew-notes.pdf")).toBeVisible();
	const firstPage = viewer.getByRole("img", { name: "Page 1 of 2" });
	await expect(firstPage).toBeVisible();
	await expect
		.poll(() =>
			firstPage.evaluate((canvas: HTMLCanvasElement) => {
				if (canvas.width === 0) return false;
				const pixels = canvas
					.getContext("2d")
					?.getImageData(0, 0, canvas.width, canvas.height).data;
				if (!pixels) return false;
				const hasPageBackground = pixels.some(
					(value, index) =>
						index % 4 === 0 && value > 200 && pixels[index + 3] === 255,
				);
				const hasText = pixels.some(
					(value, index) =>
						index % 4 === 0 && value < 128 && pixels[index + 3] === 255,
				);
				return hasPageBackground && hasText;
			}),
		)
		.toBe(true);
	expect(await hasDownloaded({ page, requested, code: "pdfjsLib" })).toBe(true);
	expect(requested.some((url) => url.includes("pdf.worker"))).toBe(true);
	await expect(viewer.getByRole("button", { name: "Download" })).toBeVisible();
});

test(
	"a PDF still sends when its first-page picture is refused",
	{ tag: "@phone" },
	async ({ page, browser }) => {
		await signInAs(page, "member");
		let isPreviewRefused = false;
		await page.route("**/api/v1/uploads", async (route) => {
			if (
				route.request().postDataBuffer()?.includes('name="kind"\r\n\r\npreview')
			) {
				isPreviewRefused = true;
				await route.fulfill({
					status: 429,
					json: { error: "Too many uploads today." },
				});
				return;
			}
			await route.continue();
		});
		await page.goto("/chat/everyone");

		const caption = `Refused picture ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		await page.locator('input[type="file"]').setInputFiles({
			name: "regatta-entries.pdf",
			mimeType: "application/pdf",
			buffer: await printedPdf(browser),
		});
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const chip = page
			.getByRole("article")
			.filter({ hasText: caption })
			.getByRole("link", { name: "Open regatta-entries.pdf" });
		await expect(chip).toBeVisible();
		expect(isPreviewRefused).toBe(true);
		await expect(chip.locator("img")).toHaveCount(0);
		await expect(page.getByText("Too many uploads today.")).toHaveCount(0);
		await expect(composer).toHaveValue("");
	},
);

test(
	"a member sends a video and someone else plays it from its poster",
	{ tag: "@desktop" },
	async ({ page, browser }) => {
		const senderRequests: string[] = [];
		page.on("request", (request) => senderRequests.push(request.url()));
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const caption = `River clip ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		expect(
			await hasDownloaded({
				page,
				requested: senderRequests,
				code: "/api/v1/uploads/video",
			}),
		).toBe(false);
		await page
			.locator('input[type="file"]')
			.setInputFiles(join(__dirname, "fixtures", "clip.mp4"));
		await composer.fill(caption);
		expect(
			await hasDownloaded({
				page,
				requested: senderRequests,
				code: "/api/v1/uploads/video",
			}),
		).toBe(false);
		const adminContext = await browser.newContext();
		const adminPage = await adminContext.newPage();
		const requested: string[] = [];
		adminPage.on("request", (request) => requested.push(request.url()));
		await signInAs(adminPage, "admin");
		await Promise.all([
			page.waitForResponse((response) =>
				response.url().includes("/chat.sendMessage?"),
			),
			page.getByRole("button", { name: "Send message" }).click(),
		]);
		// Once the message is saved, someone else opens the conversation while the sender's list catches up.
		await Promise.all([
			expect(
				page
					.getByRole("article")
					.filter({ hasText: caption })
					.getByLabel("clip.mp4", { exact: true }),
			).toBeVisible(),
			adminPage.goto("/chat/everyone"),
		]);
		expect(
			await hasDownloaded({
				page,
				requested: senderRequests,
				code: "/api/v1/uploads/video",
			}),
		).toBe(true);
		expect(
			senderRequests.filter((url) =>
				/(^|\.)vercel(-storage)?\.com$/.test(new URL(url).hostname),
			),
		).toEqual([]);

		const message = adminPage.getByRole("article").filter({ hasText: caption });
		const player = message.getByLabel("clip.mp4", { exact: true });
		await expect(player).toBeVisible();
		await expect(message.getByText(/· \d+:\d\d$/)).toBeVisible();
		await expect
			.poll(() =>
				player.evaluate(
					(video: HTMLVideoElement) =>
						new Promise<number>((resolve) => {
							const poster = new Image();
							poster.onload = () => resolve(poster.naturalWidth);
							poster.onerror = () => resolve(0);
							poster.src = video.poster;
						}),
				),
			)
			.toBeGreaterThan(0);
		expect(requested.filter((url) => url.endsWith("/play"))).toEqual([]);

		await player.evaluate((video: HTMLVideoElement) => {
			video.muted = true;
			return video.play();
		});
		await expect
			.poll(() =>
				player.evaluate((video: HTMLVideoElement) => video.currentTime),
			)
			.toBeGreaterThan(0);
		expect(requested.some((url) => url.endsWith("/play"))).toBe(true);
		await adminContext.close();
	},
);

test(
	"a sent video carries no location, also when it is named like a WebM",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const caption = `Where we rowed ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		const clip = readFileSync(join(__dirname, "fixtures", "clip.mp4"));
		expect(clip.includes("+50.4452")).toBe(true);
		await page.locator('input[type="file"]').setInputFiles([
			{ name: "clip.mp4", mimeType: "video/mp4", buffer: clip },
			{ name: "clip.webm", mimeType: "video/webm", buffer: clip },
		]);
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const message = page.getByRole("article").filter({ hasText: caption });
		for (const name of ["clip.mp4", "clip.webm"]) {
			const player = message.getByLabel(name, { exact: true });
			await expect(player).toBeVisible();
			const response = await page.request.get(
				(await player.getAttribute("src")) ?? "",
			);
			expect(response.status(), name).toBe(200);
			const stored = await response.body();
			expect(stored.length, name).toBe(clip.length);
			expect(stored.includes("+50.4452"), name).toBe(false);
			expect(stored.includes("104.6189"), name).toBe(false);
		}
	},
);

test(
	"a video the browser can't play offers to try again or download it",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const caption = `Phone clip ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		await page
			.locator('input[type="file"]')
			.setInputFiles(join(__dirname, "fixtures", "clip-hevc.mp4"));
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();
		const message = page.getByRole("article").filter({ hasText: caption });
		const player = message.getByLabel("clip-hevc.mp4", { exact: true });
		await expect(player).toBeVisible();

		await player.evaluate((video: HTMLVideoElement) => {
			video.muted = true;
			return video.play().catch(() => undefined);
		});
		await expect(
			message.getByText("This video can't play here."),
		).toBeVisible();
		await expect(
			message.getByRole("button", { name: "Download" }),
		).toHaveAttribute("href", /\/play\?download=1$/);

		await message.getByRole("button", { name: "Try again" }).click();
		await expect(player).toBeVisible();
		await expect(message.getByText("This video can't play here.")).toHaveCount(
			0,
		);
	},
);

test(
	"videos show as paused, with a date, once the club's viewing allowance is used up",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.route("**/api/v1/trpc/**", async (route) => {
			const procedures = new URL(route.request().url()).pathname
				.split("/")
				.at(-1)
				?.split(",");
			if (!procedures?.includes("chat.getMessages")) {
				await route.continue();
				return;
			}
			const response = await route.fetch();
			const results: { result?: { data?: Record<string, unknown> } }[] =
				await response.json();
			const messages = results[procedures.indexOf("chat.getMessages")]?.result;
			if (messages?.data) {
				messages.data.videosPausedUntil = new Date(
					Date.now() + 10 * 24 * 60 * 60 * 1000,
				).toISOString();
			}
			await route.fulfill({ response, json: results });
		});
		await page.goto("/chat/everyone");

		const caption = `Paused clip ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		await page
			.locator('input[type="file"]')
			.setInputFiles(join(__dirname, "fixtures", "clip.mp4"));
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const message = page.getByRole("article").filter({ hasText: caption });
		await expect(
			message.getByText(/^Videos are paused until \S.*\.$/),
		).toBeVisible();
		await expect(message.locator("video")).toHaveCount(0);
	},
);

test(
	"sending a video shows its upload progress",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		// The stored clip is small enough to upload at once, so its picture is held back until the progress shows.
		const { promise: progressShown, resolve: showProgress } =
			Promise.withResolvers<void>();
		await page.route("**/api/v1/uploads", async (route) => {
			await progressShown;
			await route.continue();
		});
		await page.goto("/chat/everyone");

		const caption = `Slow clip ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		await page
			.locator('input[type="file"]')
			.setInputFiles(join(__dirname, "fixtures", "clip.mp4"));
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const progress = page.getByRole("progressbar", { name: "Uploading video" });
		await expect(progress).toBeVisible();
		await expect
			.poll(async () => Number(await progress.getAttribute("aria-valuenow")))
			.toBeGreaterThan(0);
		showProgress();
		await expect(
			page
				.getByRole("article")
				.filter({ hasText: caption })
				.getByLabel("clip.mp4", { exact: true }),
		).toBeVisible();
		await expect(progress).toHaveCount(0);
	},
);

test("a member opens a CSV from a message and sees its cells in a table, and only then is the sheet engine downloaded", async ({
	page,
}) => {
	// The engine runs in a worker, which a production build names by a hash.
	const workers: string[] = [];
	page.on("worker", (worker) => workers.push(worker.url()));
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Erg scores ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "erg-scores.csv",
		mimeType: "text/csv",
		buffer: Buffer.from(
			"Rower,Distance (m),Time\nJordan Sculler,2000,6:52.6\nCasey Catchpole,2000,6:58.9\n",
		),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();
	const chip = page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open erg-scores.csv" });
	await expect(chip).toBeVisible();
	expect(workers).toEqual([]);

	await chip.click();
	const viewer = page.getByRole("dialog", { name: "erg-scores.csv" });
	await expect(
		viewer.getByRole("columnheader", { name: "Rower" }),
	).toBeVisible();
	await expect(
		viewer.getByRole("cell", { name: "Casey Catchpole" }),
	).toBeVisible();
	await expect(viewer.getByRole("cell", { name: "6:52.6" })).toBeVisible();
	await expect(viewer.getByRole("button", { name: "Download" })).toBeVisible();
	expect(workers).not.toEqual([]);
});

test(
	"a member opens an Excel workbook from a message and sees the cells of its first sheet",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		const upload = await page.request.post("/api/v1/uploads", {
			multipart: {
				kind: "file",
				file: {
					name: "crew-lineups.xlsx",
					mimeType:
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					buffer: xlsx([
						{
							name: "Lineups",
							rows: [
								["Boat", "Seat", "Rower", "2K (s)"],
								["Eight A", "Stroke", "Jordan Sculler", 412.6],
								["Eight A", 7, "Casey Catchpole", 418.9],
							],
						},
						{ name: "Spares", rows: [["Rower"], ["Kit Puddler"]] },
					]),
				},
			},
		});
		expect(upload.status()).toBe(200);
		const caption = `Lineups ${test.info().project.name} ${Date.now()}`;
		expect(
			(
				await page.request.post("/api/v1/trpc/chat.sendMessage?batch=1", {
					data: {
						0: {
							channelId: "everyone",
							text: caption,
							attachmentIds: [(await upload.json()).id],
						},
					},
				})
			).ok(),
		).toBeTruthy();
		await page.goto("/chat/everyone");

		await page
			.getByRole("article")
			.filter({ hasText: caption })
			.getByRole("link", { name: "Open crew-lineups.xlsx" })
			.click();
		const viewer = page.getByRole("dialog", { name: "crew-lineups.xlsx" });
		await expect(
			viewer.getByRole("columnheader", { name: "Rower" }),
		).toBeVisible();
		await expect(
			viewer.getByRole("cell", { name: "Jordan Sculler" }),
		).toBeVisible();
		await expect(viewer.getByRole("cell", { name: "418.9" })).toBeVisible();
		await expect(viewer.getByText(/first sheet, Lineups/)).toBeVisible();
		await expect(viewer.getByText("Kit Puddler")).toHaveCount(0);
	},
);

test(
	"a sheet says when it shows only its first 200 rows, has no rows, or can't be shown but can still be downloaded",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		const hugeSheet = xlsx([
			{ name: "Lineups", rows: [["Boat"], ["Eight A"]] },
		]);
		const directoryOffset = hugeSheet.readUInt32LE(hugeSheet.length - 6);
		hugeSheet.writeUInt32LE(600 * 1024 * 1024, directoryOffset + 24);
		const attachmentIds = await Promise.all(
			[
				{
					name: "season-log.csv",
					mimeType: "text/csv",
					buffer: Buffer.from(
						[
							"Session,Rower",
							...Array.from(
								{ length: 250 },
								(_, index) => `${index + 1},Rower ${index + 1}`,
							),
						].join("\n"),
					),
				},
				{
					name: "empty-log.csv",
					mimeType: "text/csv",
					buffer: Buffer.from("\n"),
				},
				{
					name: "huge-sheet.xlsx",
					mimeType:
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					buffer: hugeSheet,
				},
				{
					name: "odd-sheet.xlsx",
					mimeType:
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					buffer: Buffer.from("Boat,Seat\nEight A,Stroke\n"),
				},
			].map(async (file) => {
				const upload = await page.request.post("/api/v1/uploads", {
					multipart: { kind: "file", file },
				});
				expect(upload.status(), file.name).toBe(200);
				return (await upload.json()).id;
			}),
		);
		const caption = `Season log ${test.info().project.name} ${Date.now()}`;
		expect(
			(
				await page.request.post("/api/v1/trpc/chat.sendMessage?batch=1", {
					data: { 0: { channelId: "everyone", text: caption, attachmentIds } },
				})
			).ok(),
		).toBeTruthy();
		await page.goto("/chat/everyone");
		const message = page.getByRole("article").filter({ hasText: caption });

		await message.getByRole("link", { name: "Open season-log.csv" }).click();
		const seasonLog = page.getByRole("dialog", { name: "season-log.csv" });
		await expect(
			seasonLog.getByText(/Showing the first 200 rows/),
		).toBeVisible();
		await expect(
			seasonLog.getByRole("cell", { name: "Rower 1", exact: true }),
		).toBeVisible();
		await expect(
			seasonLog.getByRole("cell", { name: "Rower 199", exact: true }),
		).toHaveCount(1);
		await expect(
			seasonLog.getByRole("cell", { name: "Rower 150", exact: true }),
		).toBeVisible();
		await expect(
			seasonLog.getByRole("cell", { name: "Rower 200", exact: true }),
		).toHaveCount(0);
		await expect(
			seasonLog.getByRole("cell", { name: "Rower 250", exact: true }),
		).toHaveCount(0);
		await page.keyboard.press("Escape");
		await expect(seasonLog).toHaveCount(0);

		await message.getByRole("link", { name: "Open empty-log.csv" }).click();
		const emptyLog = page.getByRole("dialog", { name: "empty-log.csv" });
		await expect(emptyLog.getByText("This file has no rows.")).toBeVisible();
		await expect(emptyLog.getByRole("table")).toHaveCount(0);
		await page.keyboard.press("Escape");
		await expect(emptyLog).toHaveCount(0);

		await message.getByRole("link", { name: "Open huge-sheet.xlsx" }).click();
		const huge = page.getByRole("dialog", { name: "huge-sheet.xlsx" });
		await expect(
			huge.getByText(
				"This file can't be shown here. Download it to open it on your device.",
			),
		).toBeVisible();
		await expect(huge.getByRole("table")).toHaveCount(0);
		await page.keyboard.press("Escape");
		await expect(huge).toHaveCount(0);

		await message.getByRole("link", { name: "Open odd-sheet.xlsx" }).click();
		const odd = page.getByRole("dialog", { name: "odd-sheet.xlsx" });
		await expect(
			odd.getByText(
				"This file can't be shown here. Download it to open it on your device.",
			),
		).toBeVisible();
		await expect(odd.getByRole("table")).toHaveCount(0);
		const [downloaded] = await Promise.all([
			page.waitForEvent("download"),
			odd.getByRole("button", { name: "Download" }).click(),
		]);
		expect(downloaded.suggestedFilename()).toBe("odd-sheet.xlsx");
	},
);

test(
	"a picture is always sent as a photo, which needs no text",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();

		await page.locator('input[type="file"]').setInputFiles({
			name: "wave.gif",
			mimeType: "image/gif",
			buffer: await sharp({
				create: { width: 120, height: 80, channels: 3, background: "#3b82c4" },
			})
				.gif()
				.toBuffer(),
		});
		const upload = page.waitForResponse(
			(response) =>
				response.url().endsWith("/api/v1/uploads") &&
				response.request().method() === "POST",
		);
		await page.getByRole("button", { name: "Send message" }).click();
		const { id } = await (await upload).json();

		const message = page.getByRole("article").filter({
			has: page.locator(`img[src^="/api/v1/chat/attachments/${id}?"]`),
		});
		const image = message
			.getByRole("button", { name: "View photo" })
			.getByRole("img", { name: "Photo from Morgan Oarsby" });
		await expect(image).toBeVisible();
		await expect
			.poll(() =>
				image.evaluate((element: HTMLImageElement) => element.naturalWidth),
			)
			.toBeGreaterThan(0);
		await expect(message.getByRole("link", { name: /^Download/ })).toHaveCount(
			0,
		);
	},
);

test(
	"a program is refused and stays in the composer",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const caption = `Installer ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		await page.locator('input[type="file"]').setInputFiles({
			name: "setup.exe",
			mimeType: "application/x-msdownload",
			buffer: Buffer.concat([Buffer.from("MZ"), Buffer.alloc(256)]),
		});
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		await expect(
			page.getByText("Programs, scripts and web pages can't be shared here."),
		).toBeVisible();
		await expect(
			page.getByRole("article").filter({ hasText: caption }),
		).toHaveCount(0);
		await expect(composer).toHaveValue(caption);
		await expect(
			page.getByRole("button", { name: "Remove setup.exe" }),
		).toBeVisible();
	},
);

test(
	"a member drops a photo and a PDF on the conversation and sends them",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const caption = `Regatta day ${test.info().project.name} ${Date.now()}`;
		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		const dataTransfer = await fileTransfer({
			page,
			files: [
				{
					name: "regatta.jpg",
					mimeType: "image/jpeg",
					buffer: await photo({ width: 900, height: 600 }),
				},
				{
					name: "heat-sheet.pdf",
					mimeType: "application/pdf",
					buffer: pdf(caption),
				},
			],
		});
		await composer.dispatchEvent("dragenter", { dataTransfer });
		const overlay = page.getByText("Drop files to add them to your message");
		await expect(overlay).toBeVisible();
		await overlay.dispatchEvent("dragover", { dataTransfer });
		await overlay.dispatchEvent("drop", { dataTransfer });

		await expect(overlay).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: "Remove regatta.jpg" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Remove heat-sheet.pdf" }),
		).toBeVisible();
		await composer.fill(caption);
		await page.getByRole("button", { name: "Send message" }).click();

		const message = page.getByRole("article").filter({ hasText: caption });
		await expect(
			message.getByRole("button", { name: "View photo" }),
		).toHaveCount(1);
		await expect(
			message.getByRole("link", { name: "Open heat-sheet.pdf" }),
		).toHaveCount(1);
	},
);

test(
	"a pasted screenshot is added to the message, but pasted rich text adds no picture",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		const screenshot = await sharp({
			create: { width: 320, height: 200, channels: 3, background: "#3b82c4" },
		})
			.png()
			.toBuffer();
		await composer.evaluate(
			(element, clipboardData) =>
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData,
						bubbles: true,
						cancelable: true,
					}),
				),
			await fileTransfer({
				page,
				files: [
					{ name: "screenshot.png", mimeType: "image/png", buffer: screenshot },
				],
			}),
		);
		await expect(
			page.getByRole("button", { name: "Remove screenshot.png" }),
		).toBeVisible();

		await composer.evaluate(
			(element, clipboardData) => {
				clipboardData.setData(
					"text/html",
					"<table><tr><td>2K</td></tr></table>",
				);
				clipboardData.setData("text/plain", "2K");
				element.dispatchEvent(
					new ClipboardEvent("paste", {
						clipboardData,
						bubbles: true,
						cancelable: true,
					}),
				);
			},
			await fileTransfer({
				page,
				files: [
					{ name: "cells.png", mimeType: "image/png", buffer: screenshot },
				],
			}),
		);
		await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "Remove cells.png" }),
		).toHaveCount(0);
	},
);

test(
	"dragging something already in the conversation offers no drop, a file dropped beside the conversation is ignored, and the drop overlay does not outlive the drag",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");

		const composer = page.getByRole("textbox", { name: /^Message/ });
		await expect(composer).toBeVisible();
		const files = [
			{
				name: "tile.jpg",
				mimeType: "image/jpeg",
				buffer: await photo({ width: 300, height: 200 }),
			},
		];
		const overlay = page.getByText("Drop files to add them to your message");

		const fromConversation = await fileTransfer({ page, files });
		await page
			.getByRole("article")
			.first()
			.dispatchEvent("dragstart", { dataTransfer: fromConversation });
		await composer.dispatchEvent("dragenter", {
			dataTransfer: fromConversation,
		});
		await composer.dispatchEvent("dragover", {
			dataTransfer: fromConversation,
		});
		await expect(overlay).toHaveCount(0);

		const dataTransfer = await fileTransfer({ page, files });
		await composer.dispatchEvent("dragenter", { dataTransfer });
		await expect(overlay).toBeVisible();
		expect(
			await page.locator("body").evaluate(
				(body, missed) =>
					body.dispatchEvent(
						new DragEvent("drop", {
							dataTransfer: missed,
							bubbles: true,
							cancelable: true,
						}),
					),
				dataTransfer,
			),
			"the browser is stopped from opening the file",
		).toBe(false);
		await expect(overlay).toHaveCount(0);
		await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);

		await composer.dispatchEvent("dragenter", { dataTransfer });
		await expect(overlay).toBeVisible();
		await composer.dispatchEvent("dragleave", { dataTransfer });
		await expect(overlay).toHaveCount(0);
	},
);

test("a member mentions someone from the @ button and the message shows the mention", async ({
	page,
	browser,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();

	await page.getByRole("button", { name: "Mention someone" }).click();
	await expect(composer).toBeFocused();
	await composer.pressSequentially("Cox");
	const list = page.getByRole("listbox", { name: "People to mention" });
	const option = list.getByRole("option", { name: "Avery Coxwell" });
	await expect(option).toBeVisible();
	const listBox = await list.boundingBox();
	const composerBox = await composer.boundingBox();
	const viewport = page.viewportSize();
	expect(listBox && composerBox && viewport).toBeTruthy();
	if (listBox && composerBox && viewport) {
		expect(listBox.y + listBox.height).toBeLessThanOrEqual(composerBox.y);
		expect(listBox.y).toBeGreaterThanOrEqual(0);
		expect(listBox.x).toBeGreaterThanOrEqual(0);
		expect(listBox.x + listBox.width).toBeLessThanOrEqual(viewport.width);
	}
	if (test.info().project.name === "phone") {
		await option.tap();
	} else {
		await option.click();
	}
	await expect(list).toHaveCount(0);
	await expect(composer).toHaveValue("@Avery Coxwell ");
	await expect(composer).toBeFocused();

	const ending = `can you open the boat bay ${test.info().project.name} ${Date.now()}`;
	await composer.pressSequentially(ending);
	await composer.press("Enter");
	const message = page.getByRole("article").filter({ hasText: ending });
	await expect(
		message.locator("mark", { hasText: "@Avery Coxwell" }),
	).toBeVisible();

	const adminContext = await browser.newContext();
	const adminPage = await adminContext.newPage();
	await signInAs(adminPage, "admin");
	await adminPage.goto("/chat/everyone");
	await expect(
		adminPage
			.getByRole("article")
			.filter({ hasText: ending })
			.locator("mark", { hasText: "@Avery Coxwell" }),
	).toBeVisible();
	await adminContext.close();
});

test(
	"arrow keys and Enter choose a mention without sending, and Escape closes the list",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		const composer = page.getByRole("textbox", { name: /^Message/ });
		const list = page.getByRole("listbox", { name: "People to mention" });
		const question = `Who has the trailer keys ${test.info().project.name} ${Date.now()}`;

		await composer.fill(`${question} `);
		await composer.press("End");
		await composer.pressSequentially("@r");
		await expect(list.getByRole("option").nth(1)).toBeVisible();
		const second =
			(await list.getByRole("option").nth(1).getAttribute("aria-label")) ?? "";
		await expect(list.getByRole("option").first()).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await composer.press("ArrowDown");
		await expect(list.getByRole("option").nth(1)).toHaveAttribute(
			"aria-selected",
			"true",
		);
		await composer.press("Enter");
		await expect(composer).toHaveValue(`${question} @${second} `);
		await expect(
			page.getByRole("article").filter({ hasText: question }),
		).toHaveCount(0);

		await composer.pressSequentially("or @r");
		await expect(list).toBeVisible();
		await composer.press("Escape");
		await expect(list).toHaveCount(0);
		await expect(composer).toHaveValue(`${question} @${second} or @r`);

		await composer.press("Enter");
		const message = page.getByRole("article").filter({ hasText: question });
		await expect(message).toHaveCount(1);
		await expect(
			message.locator("mark", { hasText: `@${second}` }),
		).toBeVisible();
		await expect(composer).toHaveValue("");

		await composer.pressSequentially("@");
		await expect(list).toBeVisible();
		await composer.press("Escape");
		await expect(list).toHaveCount(0);
		await composer.press("Backspace");
		await composer.pressSequentially("@r");
		await expect(list).toBeVisible();
	},
);

test(
	"a group chat offers only the people in it, and a mention of anyone else is saved as plain text",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		const [{ result: channels }] = await (
			await page.request.get("/api/v1/trpc/chat.getChannels?batch=1&input={}")
		).json();
		const crew = channels.data.data.find(
			(channel: { name: string }) => channel.name === "Competitive Crew",
		);
		const [{ result: members }] = await (
			await page.request.get("/api/v1/trpc/chat.getMembers?batch=1&input={}")
		).json();
		const userId = (name: string) =>
			members.data.data.find((person: { name: string }) => person.name === name)
				.id;
		const text = `@Rowan Rigger and @Jordan Sculler ${test.info().project.name} ${Date.now()}`;
		const response = await page.request.post(
			"/api/v1/trpc/chat.sendMessage?batch=1",
			{
				data: {
					0: {
						channelId: crew.id,
						text,
						mentions: [
							{
								userId: userId("Rowan Rigger"),
								start: 0,
								length: "@Rowan Rigger".length,
							},
							{
								userId: userId("Jordan Sculler"),
								start: text.indexOf("@Jordan Sculler"),
								length: "@Jordan Sculler".length,
							},
						],
					},
				},
			},
		);
		expect(response.ok()).toBeTruthy();
		await page.goto(`/chat/${crew.id}`);
		await expect(
			page.getByRole("article").filter({ hasText: text }).locator("mark"),
		).toHaveText("@Jordan Sculler");
		const composer = page.getByRole("textbox", { name: /^Message/ });
		const list = page.getByRole("listbox", { name: "People to mention" });

		await composer.pressSequentially("@Jordan");
		await expect(
			list.getByRole("option", { name: "Jordan Sculler" }),
		).toBeVisible();

		await composer.fill("");
		await composer.pressSequentially("@Rowan");
		await expect(list).toHaveCount(0);
		await composer.fill("");
		await composer.pressSequentially("@");
		await expect(list.getByRole("option").first()).toBeVisible();
		await expect(
			list.getByRole("option", { name: "Rowan Rigger" }),
		).toHaveCount(0);
	},
);

test("a thread reply can mention someone, and its author edits it in the thread composer, also inside the phone drawer", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	const question = `Which erg has the loose chain ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await composer.fill(question);
	await composer.press("Enter");
	const root = page.getByRole("article").filter({ hasText: question });
	await root.click();
	await root.getByRole("button", { name: "Reply in thread" }).click();
	const threadComposer = page.getByRole("textbox", { name: "Reply…" });
	await expect(threadComposer).toBeVisible();

	await threadComposer.pressSequentially("@Aver");
	const list = page.getByRole("listbox", { name: "People to mention" });
	const option = list.getByRole("option", { name: "Avery Coxwell" });
	await expect(option).toBeVisible();
	if (test.info().project.name === "phone") {
		const listBox = await list.boundingBox();
		const viewport = page.viewportSize();
		expect(listBox && viewport).toBeTruthy();
		if (listBox && viewport) {
			expect(listBox.y).toBeGreaterThanOrEqual(0);
			expect(listBox.x).toBeGreaterThanOrEqual(0);
			expect(listBox.x + listBox.width).toBeLessThanOrEqual(viewport.width);
			expect(listBox.y + listBox.height).toBeLessThanOrEqual(viewport.height);
		}
		await option.tap();
	} else {
		await option.click();
	}
	await expect(threadComposer).toHaveValue("@Avery Coxwell ");
	const reply = `it needs a new chain ${test.info().project.name} ${Date.now()}`;
	await threadComposer.pressSequentially(reply);
	await threadComposer.press("Enter");
	const row = page.getByRole("article").filter({ hasText: reply });
	await expect(
		row.locator("mark", { hasText: "@Avery Coxwell" }),
	).toBeVisible();

	await row.click();
	await row.getByRole("button", { name: "More actions" }).click();
	await page.getByRole("menuitem", { name: "Edit message" }).click();
	const editor = page.getByRole("textbox", { name: "Edit message" });
	await expect(editor).toHaveCount(1);
	await expect(editor).toHaveValue(`@Avery Coxwell ${reply}`);
	await editor.pressSequentially(" today");
	await editor.press("Enter");
	await expect(
		page
			.getByRole("article")
			.filter({ hasText: `${reply} today` })
			.getByText("(edited)"),
	).toBeVisible();
	await expect(threadComposer).toHaveValue("");
	await expect(page.getByRole("heading", { name: "Thread" })).toBeVisible();
});

test(
	"editing a message keeps its mention, and removing the name removes it",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		const composer = page.getByRole("textbox", { name: /^Message/ });
		const unique = `${test.info().project.name} ${Date.now()}`;

		await composer.pressSequentially(`The launch is ready ${unique} @Jord`);
		await page
			.getByRole("listbox", { name: "People to mention" })
			.getByRole("option", { name: "Jordan Sculler" })
			.click();
		await composer.press("Enter");
		const message = page.getByRole("article").filter({ hasText: unique });
		const mark = message.locator("mark", { hasText: "@Jordan Sculler" });
		await expect(mark).toBeVisible();

		const editor = page.getByRole("textbox", { name: "Edit message" });
		await message.click();
		await message.getByRole("button", { name: "More actions" }).click();
		await page.getByRole("menuitem", { name: "Edit message" }).click();
		await expect(editor).toHaveValue(
			`The launch is ready ${unique} @Jordan Sculler`,
		);
		await expect(editor).toBeFocused();
		await editor.press("Escape");
		await expect(page.getByText("Editing message")).toHaveCount(0);

		await message.click();
		await message.getByRole("button", { name: "More actions" }).click();
		await page.getByRole("menuitem", { name: "Edit message" }).click();
		await expect(editor).toBeFocused();
		await editor.pressSequentially(" at the dock");
		await editor.press("Enter");
		await expect(message.getByText("(edited)")).toBeVisible();
		await expect(message).toContainText("at the dock");
		await expect(mark).toBeVisible();

		await message.click();
		await message.getByRole("button", { name: "More actions" }).click();
		await page.getByRole("menuitem", { name: "Edit message" }).click();
		await expect(editor).toHaveValue(
			`The launch is ready ${unique} @Jordan Sculler at the dock`,
		);
		await editor.fill(`The launch is ready ${unique} at the dock`);
		await editor.press("Enter");
		await expect(message).toContainText(`${unique} at the dock`);
		await expect(message.locator("mark")).toHaveCount(0);
	},
);

test(
	"on a short phone the mention list stays on the screen when the keyboard opens",
	{ tag: "@phone" },
	async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await signInAs(page, "member");
		await page.goto("/chat/everyone");
		await page.getByRole("button", { name: "Mention someone" }).tap();
		const list = page.getByRole("listbox", { name: "People to mention" });
		await expect(list).toBeVisible();
		const height = () =>
			list.evaluate((element) => element.getBoundingClientRect().height);
		const openHeight = await height();

		// Headless Chromium has no on-screen keyboard, so report the shorter visual
		// viewport that a 336 px one leaves behind.
		await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return;
			const height = window.innerHeight - 336;
			Object.defineProperty(viewport, "height", {
				configurable: true,
				get: () => height,
			});
			viewport.dispatchEvent(new Event("resize"));
		});
		await expect.poll(height).toBeLessThan(openHeight);
		expect(
			await list.evaluate((element) => element.getBoundingClientRect().top),
		).toBeGreaterThanOrEqual(0);
		expect(
			await list.evaluate(
				(element) => element.scrollHeight > element.clientHeight,
			),
		).toBe(true);

		await page.evaluate(() => {
			const viewport = window.visualViewport;
			if (!viewport) return;
			Object.defineProperty(viewport, "height", {
				get: () => window.innerHeight,
			});
			viewport.dispatchEvent(new Event("resize"));
		});
		await expect.poll(height).toBe(openHeight);
	},
);

async function photo({
	width,
	height,
	isGrainy = false,
}: {
	width: number;
	height: number;
	isGrainy?: boolean;
}) {
	return sharp({
		create: {
			width,
			height,
			channels: 3,
			background: "#3b82c4",
			...(isGrainy && {
				noise: { type: "gaussian" as const, mean: 128, sigma: 40 },
			}),
		},
	})
		.jpeg({ quality: 90 })
		.toBuffer();
}

function pdf(text: string) {
	return Buffer.from(
		`%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n% ${text}\ntrailer << /Root 1 0 R >>\n%%EOF\n`,
	);
}

async function printedPdf(browser: Browser) {
	const scratch = await browser.newPage();
	await scratch.setContent(
		'<h1>Crew notes</h1><p>Seat race at six.</p><h1 style="break-before: page">Page two</h1>',
	);
	const buffer = await scratch.pdf();
	await scratch.close();
	return buffer;
}

// A production build names its chunks by a hash, so a script is told by the code it carries.
async function hasDownloaded({
	page,
	requested,
	code,
}: {
	page: Page;
	requested: string[];
	code: string;
}) {
	// The chunks are cached for good, so the browser reads them back without asking the server.
	return page.evaluate(
		async ({ urls, code }) =>
			(
				await Promise.all(
					urls.map(async (url) =>
						(await fetch(url, { cache: "force-cache" })).text(),
					),
				)
			).some((script) => script.includes(code)),
		{
			urls: requested.filter((url) =>
				new URL(url).pathname.startsWith("/_next/static/chunks/"),
			),
			code,
		},
	);
}

async function expectFirstPageShown(chip: Locator) {
	const firstPage = chip.locator("img");
	await firstPage.scrollIntoViewIfNeeded();
	await expect
		.poll(() =>
			firstPage.evaluate((image: HTMLImageElement) => image.naturalWidth),
		)
		.toBeGreaterThan(0);
}

function xlsx(sheets: { name: string; rows: (string | number)[][] }[]) {
	const parts: Record<string, string> = {
		"[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
		"_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
		"xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(({ name }, index) => `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`,
		"xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}</Relationships>`,
		...Object.fromEntries(
			sheets.map(({ rows }, index) => [
				`xl/worksheets/sheet${index + 1}.xml`,
				`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
					.map(
						(row, rowIndex) =>
							`<row r="${rowIndex + 1}">${row
								.map((value, column) => {
									const reference = `${String.fromCharCode(65 + column)}${rowIndex + 1}`;
									if (typeof value === "number") {
										return `<c r="${reference}"><v>${value}</v></c>`;
									}
									return `<c r="${reference}" t="inlineStr"><is><t>${value}</t></is></c>`;
								})
								.join("")}</row>`,
					)
					.join("")}</sheetData></worksheet>`,
			]),
		),
	};
	const localParts: Buffer[] = [];
	const centralParts: Buffer[] = [];
	let offset = 0;
	for (const [path, text] of Object.entries(parts)) {
		const name = Buffer.from(path);
		const content = Buffer.from(text);
		const compressed = deflateRawSync(content);
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(20, 4);
		local.writeUInt16LE(8, 8);
		local.writeUInt32LE(crc32(content), 14);
		local.writeUInt32LE(compressed.length, 18);
		local.writeUInt32LE(content.length, 22);
		local.writeUInt16LE(name.length, 26);
		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(20, 4);
		central.writeUInt16LE(20, 6);
		central.writeUInt16LE(8, 10);
		central.writeUInt32LE(crc32(content), 16);
		central.writeUInt32LE(compressed.length, 20);
		central.writeUInt32LE(content.length, 24);
		central.writeUInt16LE(name.length, 28);
		central.writeUInt32LE(offset, 42);
		localParts.push(local, name, compressed);
		centralParts.push(central, name);
		offset += local.length + name.length + compressed.length;
	}
	const directory = Buffer.concat(centralParts);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(Object.keys(parts).length, 8);
	end.writeUInt16LE(Object.keys(parts).length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...localParts, directory, end]);
}

async function fileTransfer({
	page,
	files,
}: {
	page: Page;
	files: { name: string; mimeType: string; buffer: Buffer }[];
}) {
	return page.evaluateHandle(
		(encoded) => {
			const transfer = new DataTransfer();
			for (const { name, mimeType, base64 } of encoded) {
				const bytes = Uint8Array.from(atob(base64), (char) =>
					char.charCodeAt(0),
				);
				transfer.items.add(new File([bytes], name, { type: mimeType }));
			}
			return transfer;
		},
		files.map(({ name, mimeType, buffer }) => ({
			name,
			mimeType,
			base64: buffer.toString("base64"),
		})),
	);
}
