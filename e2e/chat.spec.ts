import { expect, type Page, test } from "@playwright/test";
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
			.getByRole("link", { name: "Download lineup.csv" })
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
			.getByRole("link", { name: "Download wrong-plan.pdf" })
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
		.getByRole("link", { name: "Download race-plan.pdf" });
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
		.getByRole("link", { name: "Download race-plan.pdf" });
	await expect(adminChip).toBeVisible();
	const response = await adminPage.request.get(
		(await adminChip.getAttribute("href")) ?? "",
	);
	expect(response.status()).toBe(200);
	expect(response.headers()["content-disposition"]).toMatch(/^attachment/);
	expect(response.headers()["content-disposition"]).toContain("race-plan.pdf");
	expect(response.headers()["content-type"]).toBe("application/octet-stream");
	expect(response.headers()["x-content-type-options"]).toBe("nosniff");
	expect(response.headers()["content-security-policy"]).toBe("sandbox");
	expect((await response.body()).equals(racePlan)).toBe(true);
	await adminContext.close();
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
		message.getByRole("link", { name: "Download crew-list.xlsx" }),
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
		message.getByRole("link", { name: "Download heat-sheet.pdf" }),
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
