import { crc32, deflateRawSync } from "node:zlib";
import { type Browser, expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { stubGiphy } from "./giphy-stub";
import { signInAs } from "./sign-in";

test("a member edits their own message in the composer and it is tagged as edited", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

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
});

test("a member edits their thread reply in the thread composer, also inside the phone drawer", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	const root = page
		.getByRole("article")
		.filter({ hasText: "Erg 3 is making that clicking noise again." });
	await root.click();
	await root.getByRole("button", { name: "Reply in thread" }).click();
	const reply = `I'll tape a note on it ${Date.now()}`;
	const threadComposer = page.getByRole("textbox", { name: "Reply…" });
	await threadComposer.fill(reply);
	await threadComposer.press("Enter");
	const row = page.getByRole("article").filter({ hasText: reply });
	await expect(row).toBeVisible();
	await row.click();
	await row.getByRole("button", { name: "More actions" }).click();
	await page.getByRole("menuitem", { name: "Edit message" }).click();
	const editor = page.getByRole("textbox", { name: "Edit message" });
	await expect(editor).toHaveCount(1);
	await expect(editor).toHaveValue(reply);
	await editor.fill(`${reply} today`);
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

test("someone else's message offers no edit", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const message = page
		.getByRole("article")
		.filter({ hasText: "Erg 3 is making that clicking noise again." });
	await message.click();
	await message.getByRole("button", { name: "More actions" }).click();
	await expect(page.getByRole("menuitem", { name: "Copy text" })).toBeVisible();
	await expect(
		page.getByRole("menuitem", { name: "Edit message" }),
	).toHaveCount(0);
});

test("a member finds a GIF and sends it, and someone else sees it", async ({
	page,
	browser,
}) => {
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
});

test("when the provider refuses, GIFs pause", async ({ page, browser }) => {
	await stubGiphy({ page });
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const query = `headwind${test.info().project.name}${Date.now()}`;
	const title = `Rowing GIF ${query}1`;
	await page.getByRole("button", { name: "Add a GIF" }).click();
	await page.getByPlaceholder("Search GIFs").fill(query);
	await page
		.getByRole("button", { name: `Send GIF: ${title}`, exact: true })
		.click();
	await expect(
		page.getByRole("article").getByRole("img", { name: title, exact: true }),
	).toBeVisible();

	const refusedContext = await browser.newContext();
	const refusedPage = await refusedContext.newPage();
	await stubGiphy({ page: refusedPage, refuseWith: 429 });
	await signInAs(refusedPage, "member");
	await refusedPage.goto("/chat/everyone");
	await expect(
		refusedPage
			.getByRole("article")
			.getByText(`GIF: ${title}`, { exact: true }),
	).toBeVisible();
	await expect(
		refusedPage.getByRole("button", {
			name: "GIFs are taking a break. Try again later.",
		}),
	).toBeDisabled();
	await expect(
		refusedPage.getByRole("button", { name: "Add a GIF" }),
	).toHaveCount(0);
	await refusedContext.close();
});

test("a member under 13 has no GIF button and reads GIFs as text", async ({
	page,
	browser,
}) => {
	await stubGiphy({ page });
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const query = `puddle${test.info().project.name}${Date.now()}`;
	const title = `Rowing GIF ${query}1`;
	await page.getByRole("button", { name: "Add a GIF" }).click();
	await page.getByPlaceholder("Search GIFs").fill(query);
	await page
		.getByRole("button", { name: `Send GIF: ${title}`, exact: true })
		.click();
	await expect(
		page.getByRole("article").getByRole("img", { name: title, exact: true }),
	).toBeVisible();

	const juniorContext = await browser.newContext();
	const juniorPage = await juniorContext.newPage();
	const { requests } = await stubGiphy({ page: juniorPage });
	await signInAs(juniorPage, "junior");
	await juniorPage.goto("/chat/everyone");
	await expect(
		juniorPage.getByRole("textbox", { name: /^Message/ }),
	).toBeVisible();
	await expect(
		juniorPage.getByRole("article").getByText(`GIF: ${title}`, { exact: true }),
	).toBeVisible();
	await expect(
		juniorPage.getByRole("button", { name: "Add a GIF" }),
	).toHaveCount(0);
	await expect(
		juniorPage.getByRole("button", {
			name: "GIFs are taking a break. Try again later.",
		}),
	).toHaveCount(0);
	expect(requests).toHaveLength(0);
	await juniorContext.close();
});

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

test("a message can be a photo with no text", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();

	await page.locator('input[type="file"]').setInputFiles({
		name: "dock.jpg",
		mimeType: "image/jpeg",
		buffer: await photo({ width: 900, height: 600 }),
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
	await expect(
		message.getByRole("button", { name: "View photo" }),
	).toBeVisible();
});

test("a photo over the size limits is made smaller and still sends", async ({
	page,
}) => {
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
	await expect(image).toBeVisible({ timeout: 60_000 });
	const tileUrl = (await image.getAttribute("src")) ?? "";
	const stored = await page.request.get(tileUrl.split("?")[0]);
	expect(stored.status()).toBe(200);
	const { width = 0, height = 0 } = await sharp(await stored.body()).metadata();
	expect(Math.max(width, height)).toBeLessThanOrEqual(2560);
	const tile = await page.request.get(tileUrl);
	expect(tile.status()).toBe(200);
	const { width: tileWidth = 0, height: tileHeight = 0 } = await sharp(
		await tile.body(),
	).metadata();
	expect(Math.max(tileWidth, tileHeight)).toBeLessThanOrEqual(720);
});

test("someone who cannot read a conversation cannot load its photos", async ({
	page,
	browser,
}) => {
	await signInAs(page, "admin");
	const [{ result }] = await (
		await page.request.get("/api/v1/trpc/chat.getChannels?batch=1&input={}")
	).json();
	const masters = result.data.data.find(
		(channel: { name: string }) => channel.name === "Masters Squad",
	);
	await page.goto(`/chat/${masters.id}`);
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();

	const caption = `Masters lineup ${test.info().project.name} ${Date.now()}`;
	await page.locator('input[type="file"]').setInputFiles([
		{
			name: "lineup.jpg",
			mimeType: "image/jpeg",
			buffer: await photo({ width: 900, height: 600 }),
		},
		{
			name: "lineup.csv",
			mimeType: "text/csv",
			buffer: Buffer.from("seat,name\nstroke,Avery Coxwell\n"),
		},
	]);
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();
	const message = page.getByRole("article").filter({ hasText: caption });
	const src = await message
		.getByRole("img", { name: "Photo from Avery Coxwell" })
		.getAttribute("src");
	expect(src).toBeTruthy();
	const photoUrl = src ?? "";
	const fileUrl =
		(await message
			.getByRole("link", { name: "Open lineup.csv" })
			.getAttribute("href")) ?? "";
	expect(fileUrl).toContain("/api/v1/chat/attachments/");

	const adminResponse = await page.request.get(photoUrl);
	expect(adminResponse.status()).toBe(200);
	expect(adminResponse.headers()["content-type"]).toMatch(/^image\//);
	expect((await page.request.get(fileUrl)).status()).toBe(200);

	const memberContext = await browser.newContext();
	const memberPage = await memberContext.newPage();
	await signInAs(memberPage, "member");
	expect((await memberPage.request.get(photoUrl)).status()).toBe(404);
	expect((await memberPage.request.get(photoUrl.split("?")[0])).status()).toBe(
		404,
	);
	expect((await memberPage.request.get(fileUrl)).status()).toBe(404);
	await memberContext.close();

	const signedOutContext = await browser.newContext();
	expect((await signedOutContext.request.get(photoUrl)).status()).toBe(401);
	expect((await signedOutContext.request.get(fileUrl)).status()).toBe(401);
	await signedOutContext.close();
});

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

test("choosing more than four photos explains the limit until one is removed", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();

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
	await expect(page.getByText("A message can carry up to 4 files")).toHaveCount(
		0,
	);
	await expect(
		page.getByRole("button", { name: /^Remove photo-/ }),
	).toHaveCount(4);
});

test("a member sends a PDF with a caption and the other person downloads it unchanged", async ({
	page,
	browser,
}) => {
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
	expect(response.headers()["content-disposition"]).toContain("race-plan.pdf");
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
});

test("a member opens a PDF from a message and its pages are drawn", async ({
	page,
	browser,
}) => {
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

	await page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open crew-notes.pdf" })
		.click();
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
	await expect(viewer.getByRole("button", { name: "Download" })).toBeVisible();
});

test("the PDF engine is only downloaded when a member opens a PDF", async ({
	page,
	browser,
}) => {
	const requested: string[] = [];
	page.on("request", (request) => requested.push(request.url()));
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Lazy notes ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "lazy-notes.pdf",
		mimeType: "application/pdf",
		buffer: await printedPdf(browser),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();
	const chip = page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open lazy-notes.pdf" });
	await expect(chip).toBeVisible();
	expect(requested.filter((url) => /pdfjs|pdf\.worker/.test(url))).toEqual([]);

	await chip.click();
	await expect(
		page
			.getByRole("dialog", { name: "lazy-notes.pdf" })
			.getByRole("img", { name: "Page 1 of 2" }),
	).toBeVisible();
	expect(requested.some((url) => url.includes("pdfjs"))).toBe(true);
	expect(requested.some((url) => url.includes("pdf.worker"))).toBe(true);
});

test("a member opens a CSV from a message and sees its cells in a table", async ({
	page,
}) => {
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

	await page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open erg-scores.csv" })
		.click();
	const viewer = page.getByRole("dialog", { name: "erg-scores.csv" });
	await expect(
		viewer.getByRole("columnheader", { name: "Rower" }),
	).toBeVisible();
	await expect(
		viewer.getByRole("cell", { name: "Casey Catchpole" }),
	).toBeVisible();
	await expect(viewer.getByRole("cell", { name: "6:52.6" })).toBeVisible();
	await expect(viewer.getByRole("button", { name: "Download" })).toBeVisible();
});

test("a member opens an Excel workbook from a message and sees the cells of its first sheet", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Lineups ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
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
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

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
});

test("a sheet with more than 200 rows says the rest was left out", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Season log ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
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
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	await page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open season-log.csv" })
		.click();
	const viewer = page.getByRole("dialog", { name: "season-log.csv" });
	await expect(viewer.getByText(/Showing the first 200 rows/)).toBeVisible();
	await expect(
		viewer.getByRole("cell", { name: "Rower 1", exact: true }),
	).toBeVisible();
	await expect(
		viewer.getByRole("cell", { name: "Rower 199", exact: true }),
	).toHaveCount(1);
	await expect(
		viewer.getByRole("cell", { name: "Rower 150", exact: true }),
	).toBeVisible();
	await expect(
		viewer.getByRole("cell", { name: "Rower 200", exact: true }),
	).toHaveCount(0);
	await expect(
		viewer.getByRole("cell", { name: "Rower 250", exact: true }),
	).toHaveCount(0);
});

test("an empty sheet says it has no rows", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Empty log ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "empty-log.csv",
		mimeType: "text/csv",
		buffer: Buffer.from("\n"),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	await page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open empty-log.csv" })
		.click();
	const viewer = page.getByRole("dialog", { name: "empty-log.csv" });
	await expect(viewer.getByText("This file has no rows.")).toBeVisible();
	await expect(viewer.getByRole("table")).toHaveCount(0);
});

test("a workbook that would unpack to far more than it holds can't be shown", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const workbook = xlsx([{ name: "Lineups", rows: [["Boat"], ["Eight A"]] }]);
	const directoryOffset = workbook.readUInt32LE(workbook.length - 6);
	workbook.writeUInt32LE(600 * 1024 * 1024, directoryOffset + 24);
	const caption = `Huge sheet ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "huge-sheet.xlsx",
		mimeType:
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		buffer: workbook,
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	await page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open huge-sheet.xlsx" })
		.click();
	const viewer = page.getByRole("dialog", { name: "huge-sheet.xlsx" });
	await expect(
		viewer.getByText(
			"This file can't be shown here. Download it to open it on your device.",
		),
	).toBeVisible();
	await expect(viewer.getByRole("table")).toHaveCount(0);
});

test("a file named like a workbook that is not one can't be shown but can still be downloaded", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Odd sheet ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "odd-sheet.xlsx",
		mimeType:
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		buffer: Buffer.from("Boat,Seat\nEight A,Stroke\n"),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	await page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open odd-sheet.xlsx" })
		.click();
	const viewer = page.getByRole("dialog", { name: "odd-sheet.xlsx" });
	await expect(
		viewer.getByText(
			"This file can't be shown here. Download it to open it on your device.",
		),
	).toBeVisible();
	await expect(viewer.getByRole("table")).toHaveCount(0);
	const [downloaded] = await Promise.all([
		page.waitForEvent("download"),
		viewer.getByRole("button", { name: "Download" }).click(),
	]);
	expect(downloaded.suggestedFilename()).toBe("odd-sheet.xlsx");
});

test("the sheet engine is only downloaded when a member opens a sheet", async ({
	page,
}) => {
	const requested: string[] = [];
	page.on("request", (request) => requested.push(request.url()));
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Lazy sheet ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "lazy-sheet.csv",
		mimeType: "text/csv",
		buffer: Buffer.from("Rower,Seat\nJordan Sculler,Stroke\n"),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();
	const chip = page
		.getByRole("article")
		.filter({ hasText: caption })
		.getByRole("link", { name: "Open lazy-sheet.csv" });
	await expect(chip).toBeVisible();
	expect(requested.filter((url) => url.includes("sheet_worker"))).toEqual([]);

	await chip.click();
	await expect(
		page
			.getByRole("dialog", { name: "lazy-sheet.csv" })
			.getByRole("cell", { name: "Jordan Sculler" }),
	).toBeVisible();
	expect(requested.some((url) => url.includes("sheet_worker"))).toBe(true);
});

test("a message can carry a photo and a file together", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Crew and lineup ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles([
		{
			name: "crew.jpg",
			mimeType: "image/jpeg",
			buffer: await photo({ width: 900, height: 600 }),
		},
		{
			name: "crew-list.xlsx",
			mimeType:
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			buffer: Buffer.from("PK\u0003\u0004 crew list"),
		},
	]);
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	const message = page.getByRole("article").filter({ hasText: caption });
	await expect(message.getByRole("button", { name: "View photo" })).toHaveCount(
		1,
	);
	await expect(
		message.getByRole("link", { name: "Open crew-list.xlsx" }),
	).toHaveCount(1);
});

test("a picture is always sent as a photo", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const caption = `Wave ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	await page.locator('input[type="file"]').setInputFiles({
		name: "wave.gif",
		mimeType: "image/gif",
		buffer: await sharp({
			create: { width: 120, height: 80, channels: 3, background: "#3b82c4" },
		})
			.gif()
			.toBuffer(),
	});
	await composer.fill(caption);
	await page.getByRole("button", { name: "Send message" }).click();

	const message = page.getByRole("article").filter({ hasText: caption });
	const image = message
		.getByRole("button", { name: "View photo" })
		.getByRole("img", { name: "Photo from Morgan Oarsby" });
	await expect(image).toBeVisible();
	await expect
		.poll(() =>
			image.evaluate((element: HTMLImageElement) => element.naturalWidth),
		)
		.toBeGreaterThan(0);
	await expect(message.getByRole("link", { name: /^Download/ })).toHaveCount(0);
});

test("a program is refused and stays in the composer", async ({ page }) => {
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
});

test("a file over 4 MB explains the limit until it is removed", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	await expect(page.getByRole("textbox", { name: /^Message/ })).toBeVisible();

	await page.locator('input[type="file"]').setInputFiles({
		name: "erg-export.csv",
		mimeType: "text/csv",
		buffer: Buffer.alloc(4 * 1024 * 1024 + 1, "a"),
	});
	await expect(page.getByText("Files can be up to 4 MB")).toBeVisible();

	await page.getByRole("button", { name: "Remove erg-export.csv" }).click();
	await expect(page.getByText("Files can be up to 4 MB")).toHaveCount(0);
});

test("a member drops a photo and a PDF on the conversation and sends them", async ({
	page,
}) => {
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
	).toBeVisible();
	await expect(
		message.getByRole("link", { name: "Open heat-sheet.pdf" }),
	).toBeVisible();
});

test("a pasted screenshot is added to the message, but pasted rich text adds no picture", async ({
	page,
}) => {
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
			clipboardData.setData("text/html", "<table><tr><td>2K</td></tr></table>");
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
			files: [{ name: "cells.png", mimeType: "image/png", buffer: screenshot }],
		}),
	);
	await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(1);
	await expect(
		page.getByRole("button", { name: "Remove cells.png" }),
	).toHaveCount(0);
});

test("files dragged or pasted while a message is being edited are not added", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const original = `Trailer leaves at 7 ${test.info().project.name} ${Date.now()}`;
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await composer.fill(original);
	await composer.press("Enter");
	const message = page.getByRole("article").filter({ hasText: original });
	await expect(message).toBeVisible();
	await message.click();
	await message.getByRole("button", { name: "More actions" }).click();
	await page.getByRole("menuitem", { name: "Edit message" }).click();
	const editor = page.getByRole("textbox", { name: "Edit message" });
	await expect(editor).toBeFocused();

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

	await editor.press("Escape");
	await expect(page.getByText("Editing message")).toHaveCount(0);
	await composer.dispatchEvent("dragenter", { dataTransfer });
	await expect(overlay).toBeVisible();
});

test("dragging something that is already in the conversation does not offer to add files", async ({
	page,
}) => {
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
	await composer.dispatchEvent("dragenter", { dataTransfer: fromConversation });
	await composer.dispatchEvent("dragover", { dataTransfer: fromConversation });
	await expect(overlay).toHaveCount(0);

	await composer.dispatchEvent("dragenter", {
		dataTransfer: await fileTransfer({ page, files }),
	});
	await expect(overlay).toBeVisible();
});

test("a file dropped beside the conversation is ignored and the drop overlay does not outlive the drag", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const composer = page.getByRole("textbox", { name: /^Message/ });
	await expect(composer).toBeVisible();
	const dataTransfer = await fileTransfer({
		page,
		files: [
			{
				name: "missed.pdf",
				mimeType: "application/pdf",
				buffer: pdf("missed"),
			},
		],
	});
	const overlay = page.getByText("Drop files to add them to your message");

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
});

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
