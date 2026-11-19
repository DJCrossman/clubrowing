import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("a training event's details list its workout's intervals in order", async ({
	page,
}) => {
	await signInAs(page, "member");
	// The seed dates the event six days out: next week, unless it ran on a Sunday.
	await page.goto(
		`/schedule?week=${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Regina" }).format(Date.now() + 7 * 24 * 60 * 60 * 1000)}`,
	);
	const event = page.getByRole("link", {
		name: "Rate ladder",
		exact: true,
		includeHidden: true,
	});
	await expect(page.getByRole("button", { name: "Next week" })).toBeVisible();
	if ((await event.count()) === 0) {
		await page.goto("/schedule");
	}
	await page.goto((await event.getAttribute("href")) ?? "");

	const details = page.getByRole("dialog");
	await expect(
		details.getByRole("heading", { name: "Rate ladder" }),
	).toBeVisible();
	await expect(details.getByText(/^6K[+−]\d+"$/)).toHaveText([
		'6K+6"',
		'6K+3"',
		'6K−2"',
	]);
	await expect(details.getByText(/^Open • /)).toBeVisible();
	await expect(details.getByText("Your split /500m")).toBeVisible();
	await expect(
		details.getByRole("list", { name: "Intervals" }).getByText(/^\d+:\d\d/),
	).toHaveCount(3);
	await expect(details.getByText(/^From your 6K test/)).toBeVisible();
});

test("a week lists all seven days and their events without picking a day", async ({
	page,
}) => {
	await signInAs(page, "member");
	// The seed dates the event six days out: next week, unless it ran on a Sunday.
	await page.goto(
		`/schedule?week=${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Regina" }).format(Date.now() + 7 * 24 * 60 * 60 * 1000)}`,
	);
	const event = page.getByRole("link", { name: "Rate ladder", exact: true });
	await expect(page.getByRole("button", { name: "Next week" })).toBeVisible();
	if ((await event.count()) === 0) {
		await page.goto("/schedule");
	}

	await expect(event).toBeVisible();
	await expect(page.getByRole("region", { name: /day, / })).toHaveCount(7);
});

test("a coach sets an interval's goal by hand and it survives a later change to the description", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/schedule?action=create");
	const drawer = page.getByRole("dialog");
	const title = `Pyramid ${Date.now()}`;
	await drawer.getByRole("button", { name: "Training" }).click();
	await drawer.getByRole("textbox", { name: "Title" }).fill(title);
	await drawer.getByRole("button", { name: "Next" }).click();

	const workout = drawer.getByRole("textbox", { name: "Workout" });
	await workout.fill("5000m\n1000m @ R20, 2000m @ R22, 2000m @ R24");
	await workout.blur();
	await expect(drawer.getByText("Read from the description")).toBeVisible();
	const intervals = drawer.getByRole("list", { name: "Intervals" });
	await expect(intervals.getByRole("listitem")).toHaveCount(3);

	await intervals
		.getByRole("listitem")
		.nth(1)
		.getByRole("button")
		.first()
		.click();
	await drawer
		.getByRole("group", { name: "Split against" })
		.getByRole("button", { name: "6K" })
		.click();
	for (let press = 0; press < 3; press++) {
		await drawer.getByRole("button", { name: "One second slower" }).click();
	}
	await expect(drawer.getByText('3" slower than 6K pace')).toBeVisible();
	await drawer.getByRole("button", { name: "Done" }).click();
	await expect(drawer.getByText("Edited by hand")).toBeVisible();

	await workout.fill("5000m\n1000m @ R20, 2000m @ R22, 2000m @ R26");
	await workout.blur();
	await expect(drawer.getByText("Edited by hand")).toBeVisible();
	await expect(intervals.getByRole("listitem")).toHaveCount(3);
	await expect(intervals.getByText(/^[26]K[+−]\d+"$/)).toHaveText([
		'2K+0"',
		'6K+3"',
		'2K+0"',
	]);
	await expect(intervals.getByText(/^R24 • /)).toBeVisible();

	await drawer.getByRole("button", { name: "Intensity C3" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(drawer).toBeHidden();
	await page.goto(
		(await page
			.getByRole("link", { name: title, exact: true, includeHidden: true })
			.getAttribute("href")) ?? "",
	);
	const details = page.getByRole("dialog");
	await expect(details.getByRole("heading", { name: title })).toBeVisible();
	await expect(details.getByText(/^[26]K[+−]\d+"$/)).toHaveText([
		'2K+0"',
		'6K+3"',
		'2K+0"',
	]);
	await expect(details.getByText(/^R20 • /)).toBeVisible();
	await expect(details.getByText(/^R24 • /)).toBeVisible();
});

test("a coach adds an interval, removes one, and re-reads the description to start over", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/schedule?action=create");
	const drawer = page.getByRole("dialog");
	await drawer.getByRole("button", { name: "Training" }).click();
	await drawer
		.getByRole("textbox", { name: "Title" })
		.fill(`Ladder ${Date.now()}`);
	await drawer.getByRole("button", { name: "Next" }).click();

	await expect(
		drawer.getByText(
			"No intervals yet. Add them if this session has set intervals.",
		),
	).toBeVisible();
	const workout = drawer.getByRole("textbox", { name: "Workout" });
	await workout.fill("5000m\n1000m @ R20, 2000m @ R22, 2000m @ R24");
	await workout.blur();
	await expect(drawer.getByText("Read from the description")).toBeVisible();
	const intervals = drawer.getByRole("list", { name: "Intervals" });
	await expect(intervals.getByRole("listitem")).toHaveCount(3);

	await drawer.getByRole("button", { name: "Add interval" }).click();
	await expect(intervals.getByRole("listitem")).toHaveCount(4);
	await expect(drawer.getByText("Edited by hand")).toBeVisible();
	await drawer
		.getByRole("group", { name: "Measured by" })
		.getByRole("button", { name: "Time" })
		.click();
	await drawer.getByRole("spinbutton", { name: "Minutes" }).fill("1");
	await drawer.getByRole("spinbutton", { name: "Seconds" }).fill("30");
	await drawer.getByRole("spinbutton", { name: "Rate (spm)" }).fill("30");
	await drawer.getByRole("button", { name: "Done" }).click();
	await expect(intervals.getByText(/^R30 • 0?1:30/)).toBeVisible();

	await intervals
		.getByRole("listitem")
		.first()
		.getByRole("button")
		.first()
		.click();
	await drawer.getByRole("button", { name: "Remove" }).click();
	await expect(intervals.getByRole("listitem")).toHaveCount(3);
	await expect(intervals.getByText(/^R20 • /)).toHaveCount(0);

	await drawer.getByRole("button", { name: "Re-read" }).click();
	await expect(drawer.getByText("Read from the description")).toBeVisible();
	await expect(intervals.getByRole("listitem")).toHaveCount(3);
	await expect(intervals.getByText(/^R20 • /)).toBeVisible();
	await expect(intervals.getByText(/^R30 • /)).toHaveCount(0);
});

test("an event with more than five intervals lists the first four until asked for the rest", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/schedule?action=create");
	const drawer = page.getByRole("dialog");
	const title = `Six by one ${Date.now()}`;
	await drawer.getByRole("button", { name: "Training" }).click();
	await drawer.getByRole("textbox", { name: "Title" }).fill(title);
	await drawer.getByRole("button", { name: "Next" }).click();

	const workout = drawer.getByRole("textbox", { name: "Workout" });
	await workout.fill(
		"6000m\n1000m @ R18, 1000m @ R20, 1000m @ R22, 1000m @ R24, 1000m @ R26, 1000m @ R28",
	);
	await workout.blur();
	await expect(
		drawer.getByRole("list", { name: "Intervals" }).getByRole("listitem"),
	).toHaveCount(6);
	await drawer.getByRole("button", { name: "Intensity C3" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(drawer).toBeHidden();

	await page.goto(
		(await page
			.getByRole("link", { name: title, exact: true, includeHidden: true })
			.getAttribute("href")) ?? "",
	);
	const details = page.getByRole("dialog");
	const intervals = details.getByRole("list", { name: "Intervals" });
	await expect(intervals.getByRole("listitem")).toHaveCount(4);
	await details.getByRole("button", { name: "Show all 6 intervals" }).click();
	await expect(intervals.getByRole("listitem")).toHaveCount(6);
	await expect(intervals.getByText(/^R28 • /)).toBeVisible();
});

test("a coach edits a session's intervals from bulk edit", async ({ page }) => {
	await signInAs(page, "admin");
	await page.goto("/schedule?action=create");
	const drawer = page.getByRole("dialog");
	const title = `Three by one ${Date.now()}`;
	await drawer.getByRole("button", { name: "Training" }).click();
	await drawer.getByRole("textbox", { name: "Title" }).fill(title);
	await drawer.getByRole("button", { name: "Next" }).click();

	const workout = drawer.getByRole("textbox", { name: "Workout" });
	await workout.fill("3000m\n1000m @ R20, 1000m @ R22, 1000m @ R24");
	await workout.blur();
	await expect(
		drawer.getByRole("list", { name: "Intervals" }).getByRole("listitem"),
	).toHaveCount(3);
	await drawer.getByRole("button", { name: "Intensity C3" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(drawer).toBeHidden();

	// The grid only renders the columns in view, so give it room for all of them.
	await page.setViewportSize({ width: 2800, height: 900 });
	await page.goto("/schedule/bulk-edit-training");
	const row = page.getByRole("row").filter({ hasText: title });
	await row.getByRole("button", { name: "3 intervals" }).click();
	const editor = page.getByRole("dialog");
	await expect(
		editor.getByRole("heading", { name: "Edit intervals" }),
	).toBeVisible();
	const intervals = editor.getByRole("list", { name: "Intervals" });
	await intervals
		.getByRole("listitem")
		.first()
		.getByRole("button")
		.first()
		.click();
	await editor.getByRole("button", { name: "Remove" }).click();
	await expect(intervals.getByRole("listitem")).toHaveCount(2);
	await editor.getByRole("button", { name: "Save" }).click();
	await expect(editor).toBeHidden();

	await row.getByRole("button", { name: "2 intervals" }).click();
	await editor
		.getByRole("button", { name: "Read intervals from the description" })
		.click();
	await expect(intervals.getByRole("listitem")).toHaveCount(3);
	await editor.getByRole("button", { name: "Save" }).click();
	await expect(row.getByRole("button", { name: "3 intervals" })).toBeVisible();
});
