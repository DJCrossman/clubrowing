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

test("a member who taps a link before their lapsed session cookie is renewed lands on that page", async ({
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

	// The Next.js dev badge sits over the phone tab bar.
	await page.addStyleTag({ content: "nextjs-portal { display: none }" });

	// Clerk renews a lapsed cookie when a page loads in full. The dummy
	// instance cannot, so the cookie comes back as that page load starts.
	await page.context().clearCookies({ name: "__session" });
	await page.route(
		(url) => url.pathname === "/schedule",
		async (route) => {
			if (route.request().resourceType() === "document") {
				await signInAs(page, "member");
			}
			await route.continue();
		},
	);
	await page
		.getByRole("link", { name: "Schedule", exact: true })
		.filter({ visible: true })
		.first()
		.click();

	await expect(page.getByRole("button", { name: "Next week" })).toBeVisible();
	await expect(page).toHaveURL(/\/schedule$/);
});

test("a member who signed out in another tab is sent to login when they tap a link", async ({
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

	// The Next.js dev badge sits over the phone tab bar.
	await page.addStyleTag({ content: "nextjs-portal { display: none }" });

	await page.context().clearCookies({ name: "__session" });
	await page
		.context()
		.addCookies([
			{ name: "__client_uat", value: "0", url: process.env.E2E_BASE_URL },
		]);
	// The dummy instance's Clerk cannot finish loading /login in full, so check
	// the redirect rather than the login screen.
	await Promise.all([
		page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname === "/schedule" &&
				new URL(response.headers().location ?? "/", response.url()).pathname ===
					"/login",
		),
		page
			.getByRole("link", { name: "Schedule", exact: true })
			.filter({ visible: true })
			.first()
			.click(),
	]);
});
