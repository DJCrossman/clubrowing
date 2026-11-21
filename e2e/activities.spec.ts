import { expect, type Locator, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { signInAs } from "./sign-in";

// Larger than the 800 px a kept screenshot is shrunk to. Noise keeps the stored file above 64 KB: reading one that size back
// hangs on a dummy instance unless next.config.ts keeps @vercel/blob out of the bundle.
const SCREENSHOT_PNG = sharp({
	create: {
		width: 1600,
		height: 900,
		channels: 3,
		background: { r: 24, g: 64, b: 120 },
		noise: { type: "gaussian", mean: 128, sigma: 64 },
	},
})
	.png()
	.toBuffer();

test("admin filters activities down to 2K and 6K tests", async ({ page }) => {
	await signInAs(page, "admin");
	await page.goto("/activities");

	const activities = page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.getByRole("link");
	await expect(activities.first()).toBeVisible();

	await page.getByRole("button", { name: "2K", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "2K", exact: true, pressed: true }),
	).toBeVisible();
	await expect(
		activities.filter({ hasNot: page.getByText(/^2,?000\s?m$/) }),
	).toHaveCount(0);
	await expect(activities.first()).toBeVisible();

	await page.getByRole("button", { name: "6K", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "6K", exact: true, pressed: true }),
	).toBeVisible();
	await expect(
		activities.filter({ hasNot: page.getByText(/^6,?000\s?m$/) }),
	).toHaveCount(0);
	await expect(activities.first()).toBeVisible();
});

test("member's interval session is not listed as a 2K test", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/activities");

	const activities = page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.getByRole("link");
	await expect(activities.filter({ hasText: "4 x 500m" })).toHaveCount(1);

	await page.getByRole("button", { name: "2K", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "2K", exact: true, pressed: true }),
	).toBeVisible();
	await expect(activities.filter({ hasText: "4 x 500m" })).toHaveCount(0);
	await expect(activities.first()).toBeVisible();
});

test("an activity's details open from its row before the server responds", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/activities");

	let respond = () => {};
	const response = new Promise<void>((resolve) => {
		respond = resolve;
	});
	await page.route(/activityId=/, async (route) => {
		await response;
		await route.continue();
	});

	await page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.getByRole("link")
		.filter({ hasText: "4 x 500m" })
		.click();
	const details = page.getByRole("dialog");
	await expect(
		details.getByRole("heading", { name: "4 x 500m" }),
	).toBeVisible();
	expect(page.url()).not.toContain("activityId=");

	respond();
	await expect(page).toHaveURL(/activityId=/);
	await expect(
		details.getByRole("heading", { name: "4 x 500m" }),
	).toBeVisible();
	await expect(
		details.getByRole("heading", { name: "Intervals" }),
	).toBeVisible();
	await expect(
		details
			.getByRole("row")
			.filter({ has: page.getByRole("cell", { name: /^500\s?m$/ }) }),
	).toHaveCount(4);
	await expect(details.getByText("Synced from Concept2")).toBeVisible();
	await expect(
		details.getByRole("heading", { name: "Stroke data" }),
	).toBeVisible();
	await expect(
		details.getByRole("button", { name: "Pace", exact: true }),
	).toBeVisible();
	await expect(
		details.getByRole("button", { name: "Rate", exact: true }),
	).toBeVisible();
	const heartRate = details.getByRole("button", {
		name: "Heart rate",
		exact: true,
	});
	await heartRate.click();
	await expect(heartRate).toHaveAttribute("aria-pressed", "true");

	await details.getByRole("button", { name: "Close", exact: true }).click();
	await expect(details).toBeHidden();
	await expect(page).not.toHaveURL(/activityId=/);
});

test("an activity reopens on its details after sharing was left open", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/activities");
	const row = page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.getByRole("link")
		.filter({ hasText: "4 x 500m" });
	const details = page.getByRole("dialog", { name: "4 x 500m" });
	const share = page.getByRole("dialog", { name: "Share to chat" });

	await row.click();
	await details.getByRole("button", { name: "Share to chat" }).click();
	await expect(share).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(details).toBeHidden();

	await row.click();
	await expect(details.getByText("Synced from Concept2")).toBeVisible();
	await expect(share).toBeHidden();
});

test("day headers show the year only for activities from an earlier year", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/activities");
	const dayHeaders = page
		.getByRole("listitem")
		.getByRole("heading", { level: 2 });
	await expect(dayHeaders.first()).toBeVisible();
	await expect(dayHeaders.first()).not.toHaveText(/\d{4}$/);

	await page.clock.setFixedTime(
		new Date(new Date().getFullYear() + 1, 0, 12, 9),
	);
	await page.reload();
	await expect(dayHeaders.first()).toBeVisible();
	await expect(dayHeaders.filter({ hasNotText: /\d{4}$/ })).toHaveCount(0);
});

test("admin filters activities by checking off members", async ({ page }) => {
	await signInAs(page, "admin");
	await page.goto("/activities");

	const activities = page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.getByRole("link");
	await expect(activities.first()).toBeVisible();

	await page.getByRole("button", { name: "All members" }).click();
	await page.getByRole("option", { name: "Morgan Oarsby" }).click();
	await expect(
		page.getByRole("option", { name: "Morgan Oarsby" }).getByRole("checkbox"),
	).toBeChecked();
	await expect(
		page.getByRole("button", { name: "Morgan Oarsby", pressed: true }),
	).toBeVisible();
	await expect(page).toHaveURL(/athleteIds=/);
	await expect(activities.filter({ hasNotText: "Morgan Oarsby" })).toHaveCount(
		0,
	);
	await expect(activities.first()).toBeVisible();

	await page.getByRole("option", { name: "Jordan Sculler" }).click();
	await expect(
		page.getByRole("button", { name: "2 members", pressed: true }),
	).toBeVisible();
	await expect(
		activities.filter({ hasText: "Jordan Sculler" }).first(),
	).toBeVisible();

	await page.reload();
	await page.getByRole("button", { name: "2 members", pressed: true }).click();
	await page.getByRole("button", { name: "Clear", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "All members", pressed: false }),
	).toBeVisible();
	await expect(page).not.toHaveURL(/athleteIds=/);
	await expect(
		activities.filter({ hasNotText: "Morgan Oarsby" }).first(),
	).toBeVisible();
});

test("member gets no member filter", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/activities");

	await expect(
		page.getByRole("button", { name: "2K", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "All members" })).toHaveCount(
		0,
	);
});

test("logging an activity from a screenshot keeps the screenshot", async ({
	page,
}) => {
	await signInAs(page, "member");
	const name = `Kept screenshot ${test.info().project.name} ${Date.now()}`;

	const id = await logActivityFromScreenshot({
		page,
		name,
		shouldKeepScreenshot: true,
	});

	const screenshot = page
		.getByRole("dialog")
		.getByAltText("Activity screenshot", { exact: true });
	await expect(screenshot).toHaveAttribute(
		"src",
		`/api/v1/activities/${id}/screenshot`,
	);
	await expect
		.poll(() =>
			screenshot.evaluate((image: HTMLImageElement) => image.naturalWidth),
		)
		.toBeGreaterThan(0);

	const fullscreen = page.getByAltText("ERG activity screenshot (fullscreen)", {
		exact: true,
	});
	await screenshot.click();
	await expect(fullscreen).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(fullscreen).toHaveCount(0);
	await expect(
		page.getByRole("dialog").getByRole("heading", { name }),
	).toBeVisible();

	const response = await page.request.get(
		`/api/v1/activities/${id}/screenshot`,
	);
	expect(response.status()).toBe(200);
	expect(response.headers()["content-type"]).toMatch(/^image\//);
	const body = await response.body();
	expect(body.length).toBeGreaterThan(64 * 1024);
	const { width = 0, height = 0 } = await sharp(body).metadata();
	expect(Math.max(width, height)).toBeGreaterThan(0);
	expect(Math.max(width, height)).toBeLessThanOrEqual(800);
});

test("the owner adds a screenshot to an existing activity without changing it", async ({
	page,
}) => {
	test.setTimeout(60_000);
	await signInAs(page, "member");
	const name = `Added screenshot ${test.info().project.name} ${Date.now()}`;
	const id = await logActivityFromScreenshot({
		page,
		name,
		shouldKeepScreenshot: false,
	});

	const details = page.getByRole("dialog");
	// The first "Distance" is the tile's label; the workout type tile reads "Distance" too.
	const distanceTile = details
		.getByText("Distance", { exact: true })
		.first()
		.locator("..");
	const timeTile = details.getByText("Time", { exact: true }).locator("..");
	const distance = (await distanceTile.textContent()) ?? "";
	const time = (await timeTile.textContent()) ?? "";
	const addScreenshot = details.getByRole("button", {
		name: "Add screenshot",
	});
	const screenshot = details.getByAltText("Activity screenshot", {
		exact: true,
	});
	await expect(addScreenshot).toBeVisible();
	await expect(screenshot).toHaveCount(0);

	await pickScreenshot({ page, button: addScreenshot });
	await expect(
		details.getByText("A screenshot can't be changed once it's saved."),
	).toBeVisible();
	await details.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(addScreenshot).toBeVisible();
	await expect(screenshot).toHaveCount(0);
	await page.reload();
	await expect(addScreenshot).toBeVisible();
	await expect(screenshot).toHaveCount(0);

	await pickScreenshot({ page, button: addScreenshot });
	await expect(
		details.getByText("A screenshot can't be changed once it's saved."),
	).toBeVisible();
	await expect(
		details.getByRole("button", { name: "Cancel", exact: true }),
	).toBeVisible();
	await details.getByRole("button", { name: "Save", exact: true }).click();
	await expect(screenshot).toHaveAttribute(
		"src",
		`/api/v1/activities/${id}/screenshot`,
	);
	await expect
		.poll(() =>
			screenshot.evaluate((image: HTMLImageElement) => image.naturalWidth),
		)
		.toBeGreaterThan(0);
	await expect(
		details.getByText("A screenshot can't be changed once it's saved."),
	).toHaveCount(0);
	await expect(addScreenshot).toHaveCount(0);
	await expect(distanceTile).toHaveText(distance);
	await expect(timeTile).toHaveText(time);

	await details.getByRole("button", { name: "Edit", exact: true }).click();
	await expect(details.getByRole("tab", { name: "ERG" })).toBeVisible();
	await expect(details.getByText("Upload ERG Screenshot")).toHaveCount(0);
	await expect(details.locator('input[type="file"]')).toHaveCount(0);
});

test("only someone who can see the activity can fetch its screenshot", async ({
	page,
}) => {
	test.setTimeout(120_000);
	const project = test.info().project.name;
	await signInAs(page, "admin");
	const adminActivityId = await logActivityFromScreenshot({
		page,
		name: `Admin screenshot ${project} ${Date.now()}`,
		shouldKeepScreenshot: true,
	});

	await signInAs(page, "member");
	const memberActivityName = `Member screenshot ${project} ${Date.now()}`;
	const memberActivityId = await logActivityFromScreenshot({
		page,
		name: memberActivityName,
		shouldKeepScreenshot: true,
	});
	const memberActivityWithoutScreenshotName = `Member no screenshot ${project} ${Date.now()}`;
	const memberActivityWithoutScreenshotId = await logActivityFromScreenshot({
		page,
		name: memberActivityWithoutScreenshotName,
		shouldKeepScreenshot: false,
	});
	expect(
		(
			await page.request.get(`/api/v1/activities/${adminActivityId}/screenshot`)
		).status(),
	).toBe(403);

	await page.context().clearCookies();
	expect(
		(
			await page.request.get(`/api/v1/activities/${adminActivityId}/screenshot`)
		).status(),
	).toBe(401);

	await signInAs(page, "admin");
	expect(
		(
			await page.request.get(
				`/api/v1/activities/${memberActivityId}/screenshot`,
			)
		).status(),
	).toBe(200);
	expect(
		(
			await page.request.post(
				"/api/v1/trpc/activities.attachActivityScreenshot",
				{
					data: {
						id: memberActivityWithoutScreenshotId,
						uploadId: "upl_unused",
					},
				},
			)
		).status(),
	).toBe(403);
	const details = page.getByRole("dialog");
	await page.goto(`/activities?activityId=${memberActivityId}`);
	await expect(
		details.getByRole("heading", { name: memberActivityName }),
	).toBeVisible();
	await expect
		.poll(() =>
			details
				.getByAltText("Activity screenshot", { exact: true })
				.evaluate((image: HTMLImageElement) => image.naturalWidth),
		)
		.toBeGreaterThan(0);

	await page.goto(
		`/activities?activityId=${memberActivityWithoutScreenshotId}`,
	);
	await expect(
		details.getByRole("heading", { name: memberActivityWithoutScreenshotName }),
	).toBeVisible();
	await expect(details.getByText("Athlete", { exact: true })).toBeVisible();
	await expect(
		details.getByRole("button", { name: "Add screenshot" }),
	).toHaveCount(0);
});

test("the owner hides an activity from coaches and can show it again", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await signInAs(page, "member");
	const name = `Hidden ${test.info().project.name} ${Date.now()}`;
	const id = await logActivityFromScreenshot({
		page,
		name,
		shouldKeepScreenshot: false,
	});
	const details = page.getByRole("dialog");
	const hide = details.getByRole("switch", { name: "Hide from others" });
	await expect(hide).not.toBeChecked();
	const hidden = page.waitForResponse((response) =>
		response.url().includes("activities.setActivityHidden"),
	);
	await hide.click();
	expect((await hidden).ok()).toBe(true);
	await page.reload();
	await expect(details.getByRole("heading", { name })).toBeVisible();
	await expect(hide).toBeChecked();

	await signInAs(page, "admin");
	await page.goto(`/activities?activityId=${id}`);
	await expect(
		page.getByRole("button", { name: "2K", exact: true }),
	).toBeVisible();
	await expect(details.getByRole("heading", { name })).toHaveCount(0);
	expect(
		(
			await page.request.post("/api/v1/trpc/activities.setActivityHidden", {
				data: { id, isHidden: false },
			})
		).status(),
	).toBe(403);

	await signInAs(page, "member");
	await page.goto(`/activities?activityId=${id}`);
	await expect(hide).toBeChecked();
	const shown = page.waitForResponse((response) =>
		response.url().includes("activities.setActivityHidden"),
	);
	await hide.click();
	expect((await shown).ok()).toBe(true);

	await signInAs(page, "admin");
	await page.goto(`/activities?activityId=${id}`);
	await expect(details.getByRole("heading", { name })).toBeVisible();
	await expect(hide).toHaveCount(0);
});

async function logActivityFromScreenshot({
	page,
	name,
	shouldKeepScreenshot,
}: {
	page: Page;
	name: string;
	shouldKeepScreenshot: boolean;
}) {
	// A dummy instance has no vision model, so the parse answers with this result.
	await page.route("**/api/v1/activities/screenshot", async (route) => {
		const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
		await route.fulfill({
			json: {
				success: true,
				data: {
					type: "erg",
					name,
					// Years back, so the rows these tests leave never reach the first page of the list.
					startDate: "2015-06-01T13:00:00.000Z",
					timezone: "America/Regina",
					workoutType: "distance",
					elapsedTime: 301_700,
					distance: 1234,
					athleteId: body.match(/name="athleteId"\r\n\r\n([^\r]+)/)?.[1],
				},
			},
		});
	});
	await page.goto("/activities");
	await page.getByRole("button", { name: "Add Activity" }).click();
	const createDrawer = page.getByRole("dialog", { name: "Add Activity" });
	await createDrawer.getByRole("tab", { name: "ERG" }).click();
	await createDrawer.locator('input[type="file"]').setInputFiles({
		name: "pm5.png",
		mimeType: "image/png",
		buffer: await SCREENSHOT_PNG,
	});
	await expect(createDrawer.getByText("Parsed Data")).toBeVisible();
	await expect(createDrawer.getByText("Parsing...")).toHaveCount(0);
	if (!shouldKeepScreenshot) {
		await createDrawer.getByRole("button", { name: "Remove Image" }).click();
		await expect(createDrawer.getByText("Parsed Data")).toHaveCount(0);
	}
	const created = page.waitForResponse((response) =>
		response.url().includes("activities.createActivity"),
	);
	const attached =
		shouldKeepScreenshot &&
		page.waitForResponse((response) =>
			response.url().includes("activities.attachActivityScreenshot"),
		);
	await createDrawer.getByRole("button", { name: "Save", exact: true }).click();
	const [{ result }] = await (await created).json();
	const id: string = result.data.id;
	await expect(createDrawer).toBeHidden();
	if (attached) {
		expect((await attached).ok()).toBe(true);
	}

	await page.goto(`/activities?activityId=${id}`);
	const details = page.getByRole("dialog");
	await expect(details.getByRole("heading", { name })).toBeVisible();
	if (shouldKeepScreenshot) {
		await expect(
			details.getByAltText("Activity screenshot", { exact: true }),
		).toBeVisible();
	}
	return id;
}

async function pickScreenshot({
	page,
	button,
}: {
	page: Page;
	button: Locator;
}) {
	const fileChooser = page.waitForEvent("filechooser");
	await button.click();
	await (await fileChooser).setFiles({
		name: "pm5.png",
		mimeType: "image/png",
		buffer: await SCREENSHOT_PNG,
	});
}
