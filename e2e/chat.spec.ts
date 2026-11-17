import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

test("a member edits their own message in the composer and it is tagged as edited", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const original = `Boat bay opens at 6:15 ${Date.now()}`;
	const corrected = original.replace("6:15", "6:30");
	const composer = page.getByRole("textbox", { name: /^Message/ });
	await composer.fill(original);
	await composer.press("Enter");
	const message = page.getByRole("article").filter({ hasText: original });
	await expect(message).toBeVisible();
	await expect(message.getByText("(edited)")).toHaveCount(0);

	await composer.fill("Half-typed draft");
	await message.click();
	await message.getByRole("button", { name: "More actions" }).click();
	await page.getByRole("menuitem", { name: "Edit message" }).click();
	const editor = page.getByRole("textbox", { name: "Edit message" });
	await expect(page.getByText("Editing message")).toBeVisible();
	await expect(editor).toBeFocused();
	await expect(editor).toHaveValue(original);
	await editor.fill(corrected);
	await editor.press("Enter");

	await expect(
		page
			.getByRole("article")
			.filter({ hasText: corrected })
			.getByText("(edited)"),
	).toBeVisible();
	await expect(page.getByText(original)).toHaveCount(0);
	await expect(composer).toHaveValue("Half-typed draft");

	await composer.fill("");
	await composer.press("ArrowUp");
	await expect(editor).toHaveValue(corrected);
	await editor.press("Escape");
	await expect(page.getByText("Editing message")).toHaveCount(0);
	await expect(composer).toHaveValue("");
});

test("a member edits their thread reply in the thread composer, also inside the phone drawer", async ({
	page,
}) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");
	const root = page
		.getByRole("article")
		.filter({ hasText: "Erg 3 is making that clicking noise again." });
	await root.click();
	await root.getByRole("button", { name: "Reply in thread" }).click();
	const reply = `I'll tape a note on it ${Date.now()}`;
	const threadComposer = page.getByRole("textbox", { name: "Reply…" });
	await threadComposer.fill(reply);
	await threadComposer.press("Enter");
	const row = page.getByRole("article").filter({ hasText: reply });
	await expect(row).toBeVisible();
	await row.click();
	await row.getByRole("button", { name: "More actions" }).click();
	await page.getByRole("menuitem", { name: "Edit message" }).click();
	const editor = page.getByRole("textbox", { name: "Edit message" });
	await expect(editor).toHaveCount(1);
	await expect(editor).toHaveValue(reply);
	await editor.fill(`${reply} today`);
	await editor.press("Enter");
	await expect(
		page
			.getByRole("article")
			.filter({ hasText: `${reply} today` })
			.getByText("(edited)"),
	).toBeVisible();
	await expect(threadComposer).toHaveValue("");
	await expect(page.getByRole("heading", { name: "Thread" })).toBeVisible();
});

test("someone else's message offers no edit", async ({ page }) => {
	await signInAs(page, "member");
	await page.goto("/chat/everyone");

	const message = page
		.getByRole("article")
		.filter({ hasText: "Erg 3 is making that clicking noise again." });
	await message.click();
	await message.getByRole("button", { name: "More actions" }).click();
	await expect(page.getByRole("menuitem", { name: "Copy text" })).toBeVisible();
	await expect(
		page.getByRole("menuitem", { name: "Edit message" }),
	).toHaveCount(0);
});
