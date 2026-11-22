import { expect, test } from "@playwright/test";
import { DateTime } from "luxon";
import { signInAs } from "./sign-in";

test("a week lists all seven days and their events, and a training event's details list its workout's intervals in order", async ({
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
	await expect(
		page.getByRole("link", { name: "Rate ladder", exact: true }),
	).toBeVisible();
	await expect(page.getByRole("region", { name: /day, / })).toHaveCount(7);
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

test(
	"a coach sets an interval's goal by hand and it survives a later change to the description",
	{ tag: "@desktop" },
	async ({ page }) => {
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
	},
);

test(
	"a coach creates a social with no workout, and a member finds it under Socials and replies",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "admin");
		await page.goto("/schedule?action=create");
		const drawer = page.getByRole("dialog");
		const title = `Boathouse barbecue ${Date.now()}`;
		await drawer.getByRole("button", { name: "Social" }).click();
		await drawer.getByRole("textbox", { name: "Title" }).fill(title);
		await expect(drawer.getByRole("button", { name: "Next" })).toHaveCount(0);
		await drawer.getByRole("button", { name: "Save" }).click();
		await expect(drawer).toBeHidden();

		const event = page.getByRole("link", { name: title, exact: true });
		await expect(event).toBeVisible();
		await page.getByRole("button", { name: "Socials" }).click();
		await expect(page).toHaveURL(/type=social/);
		await expect(event).toBeVisible();
		await page.getByRole("button", { name: "Training", exact: true }).click();
		await expect(page).toHaveURL(/type=training/);
		await expect(event).toBeHidden();

		await signInAs(page, "member");
		await page.goto("/schedule?type=social");
		const card = page
			.locator("div")
			.filter({ has: event })
			.filter({ has: page.getByRole("group", { name: "RSVP" }) })
			.last();
		await expect(card.getByRole("button", { name: "Maybe" })).toBeVisible();
		await expect(card.getByRole("button", { name: "Can't go" })).toBeVisible();
		const replied = page.waitForResponse((response) =>
			response.url().includes("schedule.rsvp"),
		);
		await card.getByRole("button", { name: "Going" }).click();
		await expect(card.getByRole("button", { name: "Going" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await replied;

		await page.goto((await event.getAttribute("href")) ?? "");
		const details = page.getByRole("dialog");
		await expect(details.getByRole("heading", { name: title })).toBeVisible();
		await expect(details.getByText("Social", { exact: true })).toBeVisible();
		await expect(details.getByRole("heading", { name: "Workout" })).toHaveCount(
			0,
		);
		await expect(
			details.getByRole("heading", { name: /^Going 1$/ }),
		).toBeVisible();
		await expect(details.getByText("Morgan Oarsby")).toBeVisible();
	},
);

test(
	"a coach adds an interval, removes one, and re-reads the description to start over",
	{ tag: "@phone" },
	async ({ page }) => {
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
	},
);

test(
	"an event with more than five intervals lists the first four until asked for the rest",
	{ tag: "@phone" },
	async ({ page }) => {
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
	},
);

test(
	"a coach edits a session's intervals from bulk edit",
	{ tag: "@desktop" },
	async ({ page }) => {
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
		await expect(
			row.getByRole("button", { name: "3 intervals" }),
		).toBeVisible();
	},
);

test(
	"a training event saved without a workout opens for a member, and a member logs it once a coach adds one",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "admin");
		await page.goto("/schedule?action=create");
		const drawer = page.getByRole("dialog");
		const title = `Placeholder ${Date.now()}`;
		await drawer.getByRole("button", { name: "Training" }).click();
		await drawer.getByRole("textbox", { name: "Title" }).fill(title);
		await drawer.getByRole("button", { name: "Next" }).click();
		await drawer.getByRole("button", { name: "Skip for now" }).click();
		await expect(drawer).toBeHidden();
		const event = page.getByRole("link", {
			name: title,
			exact: true,
			includeHidden: true,
		});
		const href = (await event.getAttribute("href")) ?? "";

		await signInAs(page, "member");
		await page.goto("/schedule");
		await expect(event).toBeVisible();
		await page.goto(href);
		const details = page.getByRole("dialog");
		await expect(details.getByRole("heading", { name: title })).toBeVisible();
		await expect(details.getByRole("heading", { name: "Workout" })).toHaveCount(
			0,
		);
		await expect(details.getByText("No workout planned yet.")).toHaveCount(0);
		await expect(details.getByRole("list", { name: "Intervals" })).toHaveCount(
			0,
		);

		await signInAs(page, "admin");
		await page.goto(href);
		await expect(details.getByRole("heading", { name: title })).toBeVisible();
		await expect(details.getByText("No workout planned yet.")).toBeVisible();
		await details.getByRole("button", { name: "Add" }).click();
		const workout = details.getByRole("textbox", { name: "Workout" });
		await workout.fill("3000m\n1000m @ R20, 1000m @ R22, 1000m @ R24");
		await workout.blur();
		await expect(
			details.getByRole("list", { name: "Intervals" }).getByRole("listitem"),
		).toHaveCount(3);
		await details.getByRole("button", { name: "Intensity C3" }).click();
		await details.getByRole("button", { name: "Save" }).click();
		// The open form shows the intervals too, so wait for the saved workout in its place.
		await expect(details.getByRole("button", { name: "Save" })).toHaveCount(0);
		await expect(details.getByText("No workout planned yet.")).toHaveCount(0);
		await expect(
			details.getByRole("list", { name: "Intervals" }).getByRole("listitem"),
		).toHaveCount(3);
		await expect(details.getByText(/^R24 • /)).toBeVisible();

		// The junior logs it, as the member's latest activity must stay the personal best that personal-best.spec.ts celebrates.
		await signInAs(page, "junior");
		await page.goto("/activities");
		await page.getByRole("button", { name: "Add Activity" }).click();
		const createDrawer = page.getByRole("dialog", { name: "Add Activity" });
		await createDrawer.getByRole("tab", { name: "ERG" }).click();
		await createDrawer.getByRole("combobox").click();
		await page
			.getByRole("option", { name: new RegExp(`^${title} — `) })
			.click();
		const created = page.waitForResponse((response) =>
			response.url().includes("activities.createActivity"),
		);
		await createDrawer
			.getByRole("button", { name: "Save", exact: true })
			.click();
		const [{ result }] = await (await created).json();
		await expect(createDrawer).toBeHidden();

		await page.goto(`/activities?activityId=${result.data.id}`);
		const activity = page.getByRole("dialog");
		await expect(activity.getByRole("heading", { name: title })).toBeVisible();
		await expect(activity.getByText(/^3000m/)).toBeVisible();
	},
);

test(
	"a coach creates a run of weekly training events without workouts from a prompt",
	{ tag: "@desktop" },
	async ({ page }) => {
		await signInAs(page, "admin");
		// Two weeks out the form reads days from that week's Monday.
		await page.goto(
			`/schedule?week=${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Regina" }).format(Date.now() + 14 * 24 * 60 * 60 * 1000)}&action=create`,
		);
		const drawer = page.getByRole("dialog");
		await drawer
			.getByRole("button", { name: "Create several events from a prompt" })
			.click();
		await drawer
			.getByRole("textbox", { name: "Describe the events" })
			.fill("Placeholder session every Wednesday at 6:00 am");
		await drawer
			.getByLabel("Repeat weekly until")
			.fill(
				new Intl.DateTimeFormat("en-CA", { timeZone: "America/Regina" }).format(
					Date.now() + 34 * 24 * 60 * 60 * 1000,
				),
			);
		await drawer.getByRole("button", { name: "Preview events" }).click();

		await expect(drawer.getByText(/^\d+ events found$/)).toBeVisible();
		const checklist = drawer.getByRole("checkbox");
		await expect(checklist).not.toHaveCount(0);
		await expect(drawer.getByText(/^Wed \d+ \w+ · /)).toHaveCount(
			await checklist.count(),
		);
		await expect(drawer.getByText(/^C\d+ · /)).toHaveCount(0);
		const title = (
			(await drawer
				.getByRole("button", { name: /^Edit / })
				.first()
				.getAttribute("aria-label")) ?? ""
		).replace(/^Edit /, "");
		await drawer.getByRole("button", { name: /^Create \d+ events$/ }).click();
		await expect(drawer).toBeHidden();

		const events = page.getByRole("link", {
			name: title,
			exact: true,
			includeHidden: true,
		});
		await expect(events.first()).toBeAttached();
		await page.goto((await events.first().getAttribute("href")) ?? "");
		const details = page.getByRole("dialog");
		await expect(details.getByRole("heading", { name: title })).toBeVisible();
		await expect(details.getByText("No workout planned yet.")).toBeVisible();
	},
);

test(
	"a coach's prompt gives its workout to an empty training event at the same time",
	{ tag: "@phone" },
	async ({ page }) => {
		await signInAs(page, "admin");
		// Weeks start on Sunday, which is the day the form starts on.
		const sunday = DateTime.now()
			.setZone("America/Regina")
			.plus({ weeks: 6 })
			.startOf("week")
			.minus({ days: 1 })
			.toISODate();
		// Runs can share one database at the same time, so each takes its own time.
		const startTime = `${String(5 + Math.floor(Math.random() * 12)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`;
		const title = `Winter session ${test.info().project.name} ${Date.now()}`;
		await page.goto(`/schedule?week=${sunday}&action=create`);
		const drawer = page.getByRole("dialog");
		await drawer.getByRole("button", { name: "Training" }).click();
		await drawer.getByRole("textbox", { name: "Title" }).fill(title);
		await drawer
			.getByRole("textbox", { name: "Start", exact: true })
			.fill(startTime);
		await drawer.getByRole("textbox", { name: "End", exact: true }).fill("");
		await drawer.getByRole("button", { name: "Next" }).click();
		await drawer.getByRole("button", { name: "Skip for now" }).click();
		await expect(drawer).toBeHidden();

		const promptTitle = `Prompted ${title}`;
		await page.route("**/api/v1/events/parse-prompt", (route) =>
			route.fulfill({
				json: {
					events: [
						{
							type: "training",
							title: promptTitle,
							date: sunday,
							allDay: false,
							startTime,
							workout: {
								description: "3x1000m @ R20, R22, R24",
								activityType: "erg",
								intensityCategory: "C4",
							},
						},
					],
				},
			}),
		);
		await page.goto(`/schedule?week=${sunday}&action=create`);
		await drawer
			.getByRole("button", { name: "Create several events from a prompt" })
			.click();
		await drawer
			.getByRole("textbox", { name: "Describe the events" })
			.fill(`Sunday ${startTime} 3x1000m @ R20, R22, R24`);
		await drawer.getByRole("button", { name: "Preview events" }).click();
		await expect(drawer.getByText("1 event found")).toBeVisible();
		await drawer.getByRole("button", { name: "Create 1 event" }).click();
		await expect(drawer).toBeHidden();
		await expect(
			page.getByText("1 workout added to an existing session"),
		).toBeVisible();

		await expect(
			page.getByRole("link", { name: promptTitle, includeHidden: true }),
		).toHaveCount(0);
		const event = page.getByRole("link", {
			name: title,
			exact: true,
			includeHidden: true,
		});
		await expect(event).toHaveCount(1);
		await page.goto((await event.getAttribute("href")) ?? "");
		const details = page.getByRole("dialog");
		await expect(details.getByRole("heading", { name: title })).toBeVisible();
		await expect(details.getByText("No workout planned yet.")).toHaveCount(0);
		await expect(details.getByText("3x1000m @ R20, R22, R24")).toBeVisible();
	},
);
