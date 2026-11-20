import { expect, test } from "@playwright/test";
import sharp from "sharp";
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
