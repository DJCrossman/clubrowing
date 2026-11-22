import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("a member's 2K and 6K tiles lead with the split, then the total time", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/members");
	await page.getByRole("link", { name: "Morgan Oarsby" }).click();

	const details = page.getByRole("dialog");
	for (const title of ["Last 2K", "Best 2K", "Last 6K", "Best 6K"]) {
		await expect(
			details.getByText(title, { exact: true }).locator(".."),
		).toHaveText(
			new RegExp(`^${title}\\d+:\\d{2}\\.\\d/500m\\d{2}:\\d{2}\\.\\d · `),
		);
	}
});

test("an admin's details show an Admin badge under their name", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/members");
	await page.getByRole("link", { name: "Avery Coxwell" }).click();

	await expect(
		page
			.getByRole("dialog")
			.getByRole("heading", { level: 2, name: "Avery Coxwell" })
			.locator("..")
			.getByText("Admin", { exact: true }),
	).toBeVisible();
});

test("an admin invites a member by email, then revokes the invitation", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/members");
	const email = `invitee-${test.info().project.name}-${Date.now()}@example.com`;

	await page.getByRole("button", { name: /^Invite members?$/ }).click();
	const dialog = page.getByRole("dialog", { name: "Invite members" });
	await dialog.getByLabel("Emails").fill(email);
	await dialog.getByRole("button", { name: "Send invitations" }).click();
	await expect(dialog).toBeHidden();

	await page.getByRole("searchbox", { name: "Search members" }).fill(email);
	// Inside main, so the "Invitation sent" toast doesn't match too.
	const main = page.getByRole("main");
	// Every member stays listed until the search comes back, and the row moves under the open menu when it does.
	await expect(
		main.getByText(/^1 member\.?$/).filter({ visible: true }),
	).toBeVisible();
	const row = main
		.getByRole("row")
		.or(main.getByRole("listitem"))
		.filter({ hasText: email });
	await expect(row).toContainText("Invited");

	await row.getByRole("button", { name: `More actions for ${email}` }).click();
	await page.getByRole("menuitem", { name: "Revoke invitation" }).click();
	await expect(row).toHaveCount(0);
});
