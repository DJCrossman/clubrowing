import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParseDescriptionResult } from "./route";

const generateObjectFromPrompt = vi.fn();

vi.mock("@/lib/ai/generateObject", () => ({ generateObjectFromPrompt }));
vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }));

const { POST } = await import("./route");

describe("POST /api/v1/workouts/parse-description", () => {
	beforeEach(() => {
		generateObjectFromPrompt.mockReset();
	});

	it("reads a plain description without asking the model", async () => {
		const workout = await parseDescription("2x2000m w/ 5' rest", {});
		expect(generateObjectFromPrompt).not.toHaveBeenCalled();
		expect(workout).toEqual({
			workoutType: "distance",
			distance: 4000,
			intervalCount: 2,
		});
	});

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
						relativeSplitMs: 10_000,
					},
					{
						rate: null,
						elapsedTime: 60_000,
						relativeTo: "2K",
						relativeSplitMs: 6000,
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
				{ elapsedTime: 1_800_000, relativeTo: "6K", relativeSplitMs: 20_000 },
				{ elapsedTime: 1_800_000, relativeTo: "6K", relativeSplitMs: 20_000 },
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
				relativeSplitMs: 0,
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
			fragments: [{ rate: 30, relativeTo: "2K", relativeSplitMs: 0 }],
		});
		expect(untimed.elapsedTime).toBe(2_700_000);
	});

	it("keeps the pieces when the model writes null for the measure they don't have", async () => {
		const workout = await parseDescription("4x10' @ 2k+15'' w/5' rest", {
			workoutType: "time",
			intervalCount: 4,
			fragments: Array.from({ length: 4 }, () => ({
				elapsedTime: 600_000,
				distance: null,
				relativeTo: "2K",
				relativeSplitMs: 15_000,
			})),
		});
		expect(workout.fragments).toHaveLength(4);
		expect(workout.elapsedTime).toBe(2_400_000);
	});

	it("doesn't add up pieces whose time the model writes as null", async () => {
		const workout = await parseDescription("easy 45 min, bursts @ R30", {
			workoutType: "time",
			elapsedTime: 2_700_000,
			intervalCount: 1,
			fragments: [
				{
					rate: 30,
					elapsedTime: null,
					distance: null,
					relativeTo: "2K",
					relativeSplitMs: 0,
				},
			],
		});
		expect(workout.elapsedTime).toBe(2_700_000);
	});

	it.each([
		[
			"2x1k @2k target w/ 9'55'' active rest",
			{
				workoutType: "distance",
				distance: 2000,
				intervalCount: 2,
				fragments: [
					{
						elapsedTime: 595_000,
						distance: 1000,
						relativeTo: "2K",
						relativeSplitMs: 0,
					},
					{
						elapsedTime: 595_000,
						distance: 1000,
						relativeTo: "2K",
						relativeSplitMs: 0,
					},
				],
			},
		],
		[
			"3x20 w/10 stroke burst at the 15', 10' and 5' marks",
			{ workoutType: "other", intervalCount: 3 },
		],
	])("doesn't total the rests and marks of a workout that isn't timed: %s", async (description, modelReply) => {
		const workout = await parseDescription(description, modelReply);
		expect(workout.elapsedTime).toBeUndefined();
	});

	it("still reads a timed workout's total from the text when the model gives none", async () => {
		const workout = await parseDescription("70' steady", {
			workoutType: "time",
			intervalCount: 1,
		});
		expect(workout.elapsedTime).toBe(4_200_000);
	});
});

async function parseDescription(
	description: string,
	modelReply: object,
): Promise<ParseDescriptionResult> {
	generateObjectFromPrompt.mockImplementation(async ({ schema }) =>
		schema.parse(modelReply),
	);
	const response = await POST(
		new Request("http://localhost/api/v1/workouts/parse-description", {
			method: "POST",
			body: JSON.stringify({ description }),
		}),
	);
	return response.json();
}
