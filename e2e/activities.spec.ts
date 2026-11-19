import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

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
