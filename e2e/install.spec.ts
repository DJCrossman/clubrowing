import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

// Page.getInstallabilityErrors always reports "in-incognito" in a Playwright context, so check the manifest Chrome installs from.
test(
	"Chrome finds a manifest it can install the app from",
	{ tag: "@phone" },
	async ({ page, request }) => {
		await signInAs(page, "member");
		await page.goto("/");
		const cdp = await page.context().newCDPSession(page);

		const { errors, manifest } = await cdp.send("Page.getAppManifest", {});

		expect(errors).toEqual([]);
		expect(manifest.name).toBe("Club Rowing");
		expect(manifest.display).toBe("kStandalone");
		const [icon] = (manifest.icons ?? []).filter(
			({ sizes }) => Number.parseInt(sizes ?? "", 10) >= 144,
		);
		expect(icon).toBeDefined();
		const response = await request.get(icon.url);
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toBe("image/png");
	},
);

test(
	"the last onboarding step installs the app when Chrome offers it",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/onboarding?step=done");
		const install = page.getByRole("button", { name: "Install app" });

		// Chrome fires beforeinstallprompt once, so fire it until hydration has attached the listener.
		await expect
			.poll(async () => {
				await page.evaluate(() => {
					window.dispatchEvent(
						Object.assign(
							new Event("beforeinstallprompt", { cancelable: true }),
							{
								prompt: async () => {
									Object.assign(window, { installPrompted: true });
								},
								userChoice: Promise.resolve({ outcome: "accepted" }),
							},
						),
					);
				});
				return install.isVisible();
			})
			.toBe(true);
		await install.click();

		await expect
			.poll(() => page.evaluate(() => "installPrompted" in window))
			.toBe(true);
		await expect(page).not.toHaveURL(/\/onboarding/);
	},
);

test(
	"on iPhone Safari the last onboarding step explains how to add the app to the home screen",
	{ tag: "@phone" },
	async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "standalone", { value: false });
		});
		await signInAs(page, "member");
		await page.goto("/onboarding?step=done");

		await expect(
			page.getByText("To install the app, tap Share, then Add to Home Screen."),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(
			0,
		);
	},
);

test(
	"the dashboard offers to install the app until the member dismisses it",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "member");
		await page.goto("/");
		const card = page.getByRole("alert").filter({ hasText: "Install the app" });

		await expect
			.poll(async () => {
				await page.evaluate(() => {
					window.dispatchEvent(
						Object.assign(
							new Event("beforeinstallprompt", { cancelable: true }),
							{
								prompt: async () => {},
								userChoice: Promise.resolve({ outcome: "dismissed" }),
							},
						),
					);
				});
				return card.isVisible();
			})
			.toBe(true);
		await expect(
			card.getByRole("button", { name: "Install app" }),
		).toBeVisible();
		await card.getByRole("button", { name: "Dismiss" }).click();
		await expect(card).toBeHidden();

		await page.reload();
		// The hook cancels every offer it hears, so dispatchEvent returns false once it is listening.
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						!window.dispatchEvent(
							Object.assign(
								new Event("beforeinstallprompt", { cancelable: true }),
								{
									prompt: async () => {},
									userChoice: Promise.resolve({ outcome: "dismissed" }),
								},
							),
						),
				),
			)
			.toBe(true);
		await expect(card).toBeHidden();
	},
);

test(
	"on iPhone Safari the dashboard explains how to add the app to the home screen",
	{ tag: "@phone" },
	async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "standalone", { value: false });
		});
		await signInAs(page, "member");
		await page.goto("/");

		await expect(
			page.getByText(
				"Tap Share, then Add to Home Screen to open it like any other app.",
			),
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(
			0,
		);
	},
);
