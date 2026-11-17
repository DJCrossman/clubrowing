import { describe, expect, it, vi } from "vitest";
import type { ParseDescriptionResult } from "./route";

const generateTextFromPrompt = vi.fn();

vi.mock("@/lib/ai/generateText", () => ({ generateTextFromPrompt }));
vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }));

const { POST } = await import("./route");

describe("POST /api/v1/workouts/parse-description", () => {
	it("keeps a piece rowed at an open rate", async () => {
		const workout = await parseDescription(
			"90', 4x8' w/5' active recovery, 4'@R24, 3'@R28, 1' open",
			{
				workoutType: "time",
				elapsedTime: 5_400_000,
				intervalCount: 4,
				fragments: [
					{
						rate: 24,
						elapsedTime: 240_000,
						relativeTo: "2K",
						relativeSplit: 10_000,
					},
					{
						rate: null,
						elapsedTime: 60_000,
						relativeTo: "2K",
						relativeSplit: 6000,
					},
				],
			},
		);
		expect(workout.fragments).toHaveLength(2);
	});

	it.each([
		"90', 2x30' @ 6k+20\"",
		"90′\n2x30′ @ 6k+20″",
	])("takes the total the description opens with: %j", async (description) => {
		const workout = await parseDescription(description, {
			workoutType: "time",
			elapsedTime: 3_600_000,
			intervalCount: 2,
			fragments: [
				{ elapsedTime: 1_800_000, relativeTo: "6K", relativeSplit: 20_000 },
				{ elapsedTime: 1_800_000, relativeTo: "6K", relativeSplit: 20_000 },
			],
		});
		expect(workout.elapsedTime).toBe(5_400_000);
	});

	it.each([
		["3 x 20' / 4' rest @ SR 18-20.", 600_000, [20, 20, 20], 3_600_000],
		[
			"15' @ R22 / 3' rest; 10' @ R24 / 4' rest; 5' @ R26 / 5' rest; 2.5' @ R28.",
			900_000,
			[15, 10, 5, 2.5],
			1_950_000,
		],
	])("adds up the pieces of a set written without a total: %s", async (description, modelTotal, pieceMinutes, total) => {
		const workout = await parseDescription(description, {
			workoutType: "time",
			elapsedTime: modelTotal,
			intervalCount: pieceMinutes.length,
			fragments: pieceMinutes.map((minutes) => ({
				elapsedTime: minutes * 60_000,
				relativeTo: "2K",
				relativeSplit: 0,
			})),
		});
		expect(workout.elapsedTime).toBe(total);
	});

	it("leaves the model's total alone when the pieces don't settle it", async () => {
		const steady = await parseDescription("60' steady state", {
			workoutType: "time",
			elapsedTime: 3_600_000,
			intervalCount: 1,
		});
		expect(steady.elapsedTime).toBe(3_600_000);
		const untimed = await parseDescription("easy 45 min, bursts @ R30", {
			workoutType: "time",
			elapsedTime: 2_700_000,
			intervalCount: 1,
			fragments: [{ rate: 30, relativeTo: "2K", relativeSplit: 0 }],
		});
		expect(untimed.elapsedTime).toBe(2_700_000);
	});
});

async function parseDescription(
	description: string,
	modelReply: object,
): Promise<ParseDescriptionResult> {
	generateTextFromPrompt.mockResolvedValueOnce(JSON.stringify(modelReply));
	const response = await POST(
		new Request("http://localhost/api/v1/workouts/parse-description", {
			method: "POST",
			body: JSON.stringify({ description }),
		}),
	);
	return response.json();
}
