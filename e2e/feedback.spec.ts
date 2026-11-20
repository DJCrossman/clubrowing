import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

const KEYBOARD_HEIGHT = 336;

test("on a phone the feedback form waits for a tap before it takes focus", async ({
	page,
}, testInfo) => {
	test.skip(
		testInfo.project.name !== "phone",
		"Focus on open only raises a keyboard on a phone.",
	);
	await signInAs(page, "member");
	await page.goto("/more");
	await page.getByText("Send feedback", { exact: true }).tap();

	const sheet = page.getByRole("dialog");
	await expect(sheet.getByLabel("Summary")).toBeVisible();
	await expect(sheet.getByLabel("Summary")).not.toBeFocused();
	await expect(sheet.getByLabel("Details")).not.toBeFocused();
});

test("a swipe down leaves the feedback sheet in place while the keyboard is open", async ({
	page,
}, testInfo) => {
	test.skip(
		testInfo.project.name !== "phone",
		"Bottom sheets and the on-screen keyboard are phone only.",
	);
	await signInAs(page, "member");
	await page.goto("/more");
	await page.getByText("Send feedback", { exact: true }).tap();
	const sheet = page.getByRole("dialog");
	await sheet.getByLabel("Summary").tap();

	// Headless Chromium has no on-screen keyboard, so report the shorter visual
	// viewport that one leaves behind.
	await page.evaluate((keyboardHeight) => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		const height = window.innerHeight - keyboardHeight;
		Object.defineProperty(viewport, "height", { get: () => height });
		viewport.dispatchEvent(new Event("resize"));
	}, KEYBOARD_HEIGHT);
	await expect(sheet).toHaveCSS("bottom", `${KEYBOARD_HEIGHT}px`);

	const label = await sheet.getByText("Type", { exact: true }).boundingBox();
	const resting = await sheet.boundingBox();
	if (!label || !resting)
		throw new Error("The feedback sheet is not laid out.");

	// Playwright's touchscreen can only tap; a swipe needs raw touch events.
	const touchscreen = await page.context().newCDPSession(page);
	const x = label.x + label.width / 2;
	const y = label.y + label.height / 2;
	await touchscreen.send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [{ x, y }],
	});
	for (let step = 1; step <= 10; step++) {
		await touchscreen.send("Input.dispatchTouchEvent", {
			type: "touchMove",
			touchPoints: [{ x, y: y + step * 10 }],
		});
	}
	expect(await sheet.boundingBox()).toEqual(resting);
	await touchscreen.send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
});
