import { describe, expect, it } from "vitest";
import { parseWorkoutDescription } from "./parseWorkoutDescription";

describe("parseWorkoutDescription", () => {
	it.each([
		["60'", { workoutType: "time", elapsedTime: 3_600_000, intervalCount: 1 }],
		[
			"60 min",
			{ workoutType: "time", elapsedTime: 3_600_000, intervalCount: 1 },
		],
		[
			"45 minutes",
			{ workoutType: "time", elapsedTime: 2_700_000, intervalCount: 1 },
		],
		[
			"easy row, 45 min",
			{ workoutType: "time", elapsedTime: 2_700_000, intervalCount: 1 },
		],
		[
			"easy row 45 min",
			{ workoutType: "time", elapsedTime: 2_700_000, intervalCount: 1 },
		],
		[
			"60' steady state",
			{ workoutType: "time", elapsedTime: 3_600_000, intervalCount: 1 },
		],
		[
			"70′ SS",
			{ workoutType: "time", elapsedTime: 4_200_000, intervalCount: 1 },
		],
		["2000m", { workoutType: "distance", distance: 2000, intervalCount: 1 }],
		["5km", { workoutType: "distance", distance: 5000, intervalCount: 1 }],
		["5k", { workoutType: "distance", distance: 5000, intervalCount: 1 }],
		[
			"2000m time trial",
			{ workoutType: "distance", distance: 2000, intervalCount: 1 },
		],
		[
			"2000m time trial @ max rate",
			{ workoutType: "distance", distance: 2000, intervalCount: 1 },
		],
		["2x2000m", { workoutType: "distance", distance: 4000, intervalCount: 2 }],
		["3x3km", { workoutType: "distance", distance: 9000, intervalCount: 3 }],
		[
			"4 x 10'",
			{ workoutType: "time", elapsedTime: 2_400_000, intervalCount: 4 },
		],
		[
			"2x2km + 4x500m",
			{ workoutType: "distance", distance: 6000, intervalCount: 6 },
		],
		[
			"2x2000m w/ 5' rest",
			{ workoutType: "distance", distance: 4000, intervalCount: 2 },
		],
		[
			"3 x 20' /4'r",
			{ workoutType: "time", elapsedTime: 3_600_000, intervalCount: 3 },
		],
		["4x2k r4'", { workoutType: "distance", distance: 8000, intervalCount: 4 }],
		[
			"90', 4x15' w/3' rest",
			{ workoutType: "time", elapsedTime: 5_400_000, intervalCount: 4 },
		],
		[
			"90′\n3x20′ w/ 5′ rest",
			{ workoutType: "time", elapsedTime: 5_400_000, intervalCount: 3 },
		],
		[
			"5000m\n1000m @ R20, 2000m @ R22, 2000m @ R24",
			{
				workoutType: "distance",
				distance: 5000,
				intervalCount: 3,
				fragments: [
					{ rate: 20, distance: 1000, relativeTo: "2K", relativeSplit: 0 },
					{ rate: 22, distance: 2000, relativeTo: "2K", relativeSplit: 0 },
					{ rate: 24, distance: 2000, relativeTo: "2K", relativeSplit: 0 },
				],
			},
		],
		[
			"60'\n20' @ R18, 20' @ R20, 20' @ R22",
			{
				workoutType: "time",
				elapsedTime: 3_600_000,
				intervalCount: 3,
				fragments: [
					{
						rate: 18,
						elapsedTime: 1_200_000,
						relativeTo: "2K",
						relativeSplit: 0,
					},
					{
						rate: 20,
						elapsedTime: 1_200_000,
						relativeTo: "2K",
						relativeSplit: 0,
					},
					{
						rate: 22,
						elapsedTime: 1_200_000,
						relativeTo: "2K",
						relativeSplit: 0,
					},
				],
			},
		],
	])("parses %j without the AI", (description, expected) => {
		expect(parseWorkoutDescription(description)).toStrictEqual(expected);
	});

	it.each([
		"stretching and core",
		"steady state",
		"2x20' + 2000m",
		"60' with 10 power strokes every 5'",
		'2x2000m @ 2k+15"',
		'90\'\n2x30@6k+20" w/4" rest',
		"90', 2x30' @ 6k+20\"",
		"80', 5x10' w/2' rest, 4'@R20, 3'@R22, 3'@R24",
		"90', 4x8' w/5' active recovery, 4'@R24, 3'@R28, 1' open",
		"3 x 20' / 4' rest @ SR 18-20.",
		"easy 45 min, bursts @ R30",
		"2000m @ R24",
		"5000m\n1000m @ R20, 2000m @ R22",
		"1000m @ R20, 2000m @ R22, 2000m @ R24",
		"30', 4x10'",
		"10k, 2x5k",
		"60', 10' warm up, 4x10'",
		"60' w/ 5' rest",
		"60m",
		"2,000m",
		"1 hour",
	])("leaves %j to the AI", (description) => {
		expect(parseWorkoutDescription(description)).toBeUndefined();
	});
});
