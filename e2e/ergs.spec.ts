import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("the ERGs page is in the sidebar on desktop and in More on a phone", async ({
	page,
}, testInfo) => {
	await signInAs(page, "member");
	await page.goto(testInfo.project.name === "phone" ? "/more" : "/");

	await page.getByRole("link", { name: "ERGs", exact: true }).click();
	await expect(page).toHaveURL(/\/ergs$/);
	await expect(page.getByRole("heading", { name: "ERGs" })).toBeVisible();
});

test("an admin sees every erg with its distance and who it belongs to", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/ergs");

	for (const name of ["Erg 1", "Erg 2", "Erg 3", "Erg 4"]) {
		await expect(
			page
				.getByRole("row")
				.filter({ hasText: name })
				.getByRole("cell", { name: /^[\d,.]+ (km|m)$/ }),
		).toBeVisible();
	}
	await expect(
		page
			.getByRole("row")
			.filter({ hasText: "Erg 1" })
			.getByRole("cell", { name: /^[\d,.]+ (km|m)$/ }),
	).toBeInViewport();
	await expect(
		page.getByRole("row").filter({ hasText: "Erg 1" }),
	).toContainText("Club");
	await expect(
		page.getByRole("row").filter({ hasText: "Erg 3" }),
	).toContainText("Personal · Jordan");
	await expect(page.getByRole("button", { name: "Add ERG" })).toBeVisible();
});

test("a member sees the club ergs but not another athlete's personal erg, without admin controls", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/ergs");
	const ergs = page.getByRole("table");
	await expect(ergs.getByRole("link", { name: "Erg 1" })).toBeVisible();
	await expect(ergs.getByRole("link", { name: "Erg 2" })).toBeVisible();
	await expect(ergs.getByRole("link", { name: "Erg 3" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Add ERG" })).toHaveCount(0);

	await ergs.getByRole("link", { name: "Erg 1" }).click();
	const drawer = page.getByRole("dialog");
	await expect(
		drawer.getByText("Ownership", { exact: true }).locator(".."),
	).toContainText("Club");
	await expect(drawer.getByRole("button", { name: "Edit" })).toHaveCount(0);
	await expect(drawer.getByRole("button", { name: "My erg" })).toHaveCount(0);
});

test("a member cannot open another athlete's personal erg by its link", async ({
	page,
}) => {
	await signInAs(page, "admin");
	await page.goto("/ergs");
	const link = await page
		.getByRole("link", { name: "Erg 3", exact: true })
		.evaluate((anchor: HTMLAnchorElement) => anchor.href);

	await signInAs(page, "member");
	await page.goto(link);
	await expect(page.getByRole("link", { name: "Erg 1" })).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a member marks a club erg they row on as their own", async ({
	page,
}, testInfo) => {
	test.skip(
		testInfo.project.name !== "desktop",
		"Each device changes a different erg because they run at the same time against one database",
	);
	await signInAs(page, "admin");
	await page.goto("/ergs");
	await page.getByRole("link", { name: "Erg 2", exact: true }).click();
	const drawer = page.getByRole("dialog");
	const ownership = drawer
		.getByText("Ownership", { exact: true })
		.locator("..");
	await drawer.getByRole("button", { name: "Edit" }).click();
	await drawer.getByRole("combobox", { name: "Ownership" }).click();
	await page.getByRole("option", { name: "Club" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(ownership).toContainText("Club");

	await signInAs(page, "member");
	await page.goto("/ergs");
	await page.getByRole("link", { name: "Erg 2", exact: true }).click();
	await drawer.getByRole("button", { name: "My erg" }).click();
	await expect(ownership).toContainText("Personal · Morgan");
	await expect(drawer.getByRole("button", { name: "My erg" })).toHaveCount(0);

	await page.goto("/ergs");
	await expect(
		page.getByRole("row").filter({ hasText: "Erg 2" }),
	).toContainText("Personal · Morgan");
});

test("an admin gives an erg an owner, then makes it a club erg again", async ({
	page,
}, testInfo) => {
	test.skip(
		testInfo.project.name !== "phone",
		"Each device changes a different erg because they run at the same time against one database",
	);
	await signInAs(page, "admin");
	await page.goto("/ergs");
	// The Next.js dev badge sits over the phone sheet's Save button.
	await page.addStyleTag({ content: "nextjs-portal { display: none }" });
	await page.getByRole("link", { name: "Erg 4", exact: true }).click();
	const drawer = page.getByRole("dialog");
	const ownership = drawer
		.getByText("Ownership", { exact: true })
		.locator("..");

	await drawer.getByRole("button", { name: "Edit" }).click();
	await drawer.getByRole("combobox", { name: "Ownership" }).click();
	await page.getByRole("option", { name: "Personal" }).click();
	await drawer.getByRole("combobox", { name: "Owner", exact: true }).click();
	await page.getByRole("option", { name: "Riley Feathers" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(ownership).toContainText("Personal · Riley");

	await drawer.getByRole("button", { name: "Edit" }).click();
	await drawer.getByRole("combobox", { name: "Ownership" }).click();
	await page.getByRole("option", { name: "Club" }).click();
	await drawer.getByRole("button", { name: "Save" }).click();
	await expect(ownership).toContainText("Club");
	await expect(drawer.getByRole("button", { name: "My erg" })).toHaveCount(0);
});
