import { describe, expect, it, vi } from "vitest";

const generateObjectFromPrompt = vi.fn();

vi.mock("@/lib/ai/generateObject", () => ({ generateObjectFromPrompt }));
vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }));

const { POST } = await import("./route");

describe("POST /api/v1/events/parse-prompt", () => {
	it("dates the model's weekday every week through the repeat date, without a workout", async () => {
		generateObjectFromPrompt.mockImplementation(async ({ schema }) =>
			schema.parse({
				events: [
					{
						type: "training",
						title: "Placeholder session",
						days: ["Wednesday"],
						allDay: false,
						startTime: "06:00",
					},
				],
			}),
		);

		const response = await POST(
			new Request("http://localhost/api/v1/events/parse-prompt", {
				method: "POST",
				body: JSON.stringify({
					prompt: "Placeholder session every Wednesday at 6:00 am",
					type: "training",
					// A Monday.
					startDate: "2026-11-02",
					repeatUntil: "2026-11-25",
				}),
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			events: ["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"].map(
				(date) => ({
					type: "training",
					title: "Placeholder session",
					allDay: false,
					startTime: "06:00",
					date,
				}),
			),
		});
	});
});
