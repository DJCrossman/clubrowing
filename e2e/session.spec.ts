import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("a member who comes back after their session cookie lapsed stays on the page", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/activities");
	await expect(
		page
			.getByRole("listitem")
			.filter({ has: page.getByRole("heading", { level: 2 }) })
			.first(),
	).toBeVisible();
	// A query still loading is not refetched on return, so let them all land.
	await page.waitForLoadState("networkidle");

	// Clerk's 60 s cookie lapses while the tab is hidden, and clerk-js renews it
	// only once the tab is back: the first refetches go out without it.
	await page.context().clearCookies({ name: "__session" });
	await Promise.all([
		page.waitForResponse(
			(response) =>
				response.url().includes("/api/v1/trpc/") && response.status() === 401,
		),
		page.evaluate(() =>
			document.dispatchEvent(new Event("visibilitychange", { bubbles: true })),
		),
	]);
	await Promise.all([
		page.waitForResponse(
			(response) => response.url().includes("/api/v1/trpc/") && response.ok(),
		),
		signInAs(page, "member"),
	]);

	await expect(page).toHaveURL(/\/activities$/);
	await expect(
		page
			.getByRole("listitem")
			.filter({ has: page.getByRole("heading", { level: 2 }) })
			.first(),
	).toBeVisible();
});
