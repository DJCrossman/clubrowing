import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("confetti rains on every page while a member's latest activity is a personal best, without blocking clicks", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/");

	const confetti = page.locator('[data-slot="personal-best-confetti"]');
	await expect(confetti).toBeAttached({ timeout: 15_000 });

	await page.goto("/activities");
	await expect(confetti).toBeAttached({ timeout: 15_000 });

	await page.getByRole("button", { name: "2K", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "2K", exact: true, pressed: true }),
	).toBeVisible();

	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
});

test("no confetti for an admin whose latest activity is not a personal best", async ({
	page,
}) => {
	await signInAs(page, "admin");
	const stats = page.waitForResponse((response) =>
		response.url().includes("athletes.getAthleteStats"),
	);
	await page.goto("/");
	await stats;

	await expect(
		page.locator('[data-slot="personal-best-confetti"]'),
	).toHaveCount(0);
});
