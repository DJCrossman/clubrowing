import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("a training event's details list its workout's pieces in order", async ({
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
		details.getByRole("list", { name: "Pieces" }).getByText(/^\d+:\d\d/),
	).toHaveCount(3);
	await expect(details.getByText(/^From your 6K test/)).toBeVisible();
});

test("a coach sets a piece's goal by hand and it survives a later change to the description", async ({
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
	const pieces = drawer.getByRole("list", { name: "Pieces" });
	await expect(pieces.getByRole("listitem")).toHaveCount(3);

	await pieces.getByRole("listitem").nth(1).getByRole("button").first().click();
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
	await expect(pieces.getByRole("listitem")).toHaveCount(3);
	await expect(pieces.getByText(/^[26]K[+−]\d+"$/)).toHaveText([
		'2K+0"',
		'6K+3"',
		'2K+0"',
	]);
	await expect(pieces.getByText(/^R24 • /)).toBeVisible();

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

test("a coach adds a piece, removes one, and re-reads the description to start over", async ({
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
		drawer.getByText("No pieces yet. Add them if this session has set pieces."),
	).toBeVisible();
	const workout = drawer.getByRole("textbox", { name: "Workout" });
	await workout.fill("5000m\n1000m @ R20, 2000m @ R22, 2000m @ R24");
	await workout.blur();
	await expect(drawer.getByText("Read from the description")).toBeVisible();
	const pieces = drawer.getByRole("list", { name: "Pieces" });
	await expect(pieces.getByRole("listitem")).toHaveCount(3);

	await drawer.getByRole("button", { name: "Add piece" }).click();
	await expect(pieces.getByRole("listitem")).toHaveCount(4);
	await expect(drawer.getByText("Edited by hand")).toBeVisible();
	await drawer
		.getByRole("group", { name: "Measured by" })
		.getByRole("button", { name: "Time" })
		.click();
	await drawer.getByRole("spinbutton", { name: "Minutes" }).fill("1");
	await drawer.getByRole("spinbutton", { name: "Seconds" }).fill("30");
	await drawer.getByRole("spinbutton", { name: "Rate (spm)" }).fill("30");
	await drawer.getByRole("button", { name: "Done" }).click();
	await expect(pieces.getByText(/^R30 • 0?1:30/)).toBeVisible();

	await pieces
		.getByRole("listitem")
		.first()
		.getByRole("button")
		.first()
		.click();
	await drawer.getByRole("button", { name: "Remove" }).click();
	await expect(pieces.getByRole("listitem")).toHaveCount(3);
	await expect(pieces.getByText(/^R20 • /)).toHaveCount(0);

	await drawer.getByRole("button", { name: "Re-read" }).click();
	await expect(drawer.getByText("Read from the description")).toBeVisible();
	await expect(pieces.getByRole("listitem")).toHaveCount(3);
	await expect(pieces.getByText(/^R20 • /)).toBeVisible();
	await expect(pieces.getByText(/^R30 • /)).toHaveCount(0);
});

test("an event with more than five pieces lists the first four until asked for the rest", async ({
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
		drawer.getByRole("list", { name: "Pieces" }).getByRole("listitem"),
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
	const pieces = details.getByRole("list", { name: "Pieces" });
	await expect(pieces.getByRole("listitem")).toHaveCount(4);
	await details.getByRole("button", { name: "Show all 6 pieces" }).click();
	await expect(pieces.getByRole("listitem")).toHaveCount(6);
	await expect(pieces.getByText(/^R28 • /)).toBeVisible();
});
