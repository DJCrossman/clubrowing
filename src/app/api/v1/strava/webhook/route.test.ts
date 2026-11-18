import { describe, expect, it, vi } from "vitest";

const findFirst = vi.fn().mockResolvedValue({ id: "ath_1" });
const removeActivitySource = vi
	.fn()
	.mockResolvedValue({ deleted: 1, unlinked: 0 });
const afterTasks: (() => Promise<void>)[] = [];

vi.mock("@/lib/env", () => ({ envVars: {} }));
vi.mock("@/lib/db", () => ({ db: { athlete: { findFirst } } }));
vi.mock("@/server/routers/activities/common/remove-activity-source", () => ({
	removeActivitySource,
}));
vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: (task: () => Promise<void>) => afterTasks.push(task),
}));

const { POST } = await import("./route");

describe("POST /api/v1/strava/webhook", () => {
	it("keeps ids too large for a double exact", async () => {
		// As JSON numbers these round to 9007199254740992 and 9007199254740996.
		const response = await POST(
			new Request("http://localhost/api/v1/strava/webhook", {
				method: "POST",
				body: '{"object_type":"activity","object_id":9007199254740993,"aspect_type":"delete","owner_id":9007199254740995,"subscription_id":1,"event_time":1762000000}',
			}),
		);
		await Promise.all(afterTasks.map((task) => task()));

		expect(response.status).toBe(200);
		expect(findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { stravaAthleteId: "9007199254740995" },
			}),
		);
		expect(removeActivitySource).toHaveBeenCalledWith(
			expect.objectContaining({ externalId: BigInt("9007199254740993") }),
		);
	});
});
