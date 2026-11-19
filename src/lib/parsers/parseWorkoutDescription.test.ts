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
					{ rate: 20, distance: 1000, relativeTo: "2K", relativeSplitMs: 0 },
					{ rate: 22, distance: 2000, relativeTo: "2K", relativeSplitMs: 0 },
					{ rate: 24, distance: 2000, relativeTo: "2K", relativeSplitMs: 0 },
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
						relativeSplitMs: 0,
					},
					{
						rate: 20,
						elapsedTime: 1_200_000,
						relativeTo: "2K",
						relativeSplitMs: 0,
					},
					{
						rate: 22,
						elapsedTime: 1_200_000,
						relativeTo: "2K",
						relativeSplitMs: 0,
					},
				],
			},
		],
		[
			"90', 4x15' w/3' rest, 10'@R20, 3'@R22, 2'@R24 (R20@2k+25, R22@2k+20, R24@2k+15)",
			{
				workoutType: "time",
				elapsedTime: 5_400_000,
				intervalCount: 4,
				fragments: [
					{
						rate: 20,
						elapsedTime: 600_000,
						relativeTo: "2K",
						relativeSplitMs: 25_000,
					},
					{
						rate: 22,
						elapsedTime: 180_000,
						relativeTo: "2K",
						relativeSplitMs: 20_000,
					},
					{
						rate: 24,
						elapsedTime: 120_000,
						relativeTo: "2K",
						relativeSplitMs: 15_000,
					},
				],
			},
		],
		[
			"90', 4x8' w/5' active recovery, 4'@R24, 3'@R28, 1' open (R24@2k+10, R28@2k+8, open@2k+6)",
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
						rate: 28,
						elapsedTime: 180_000,
						relativeTo: "2K",
						relativeSplitMs: 8_000,
					},
					{ elapsedTime: 60_000, relativeTo: "2K", relativeSplitMs: 6_000 },
				],
			},
		],
		[
			"90', 4x15' w/4' rest, 10'@R20, 3'@R22, 2'@R24 (R20@2k+25'', R22@2k+20'', R24@2k+15'')",
			{
				workoutType: "time",
				elapsedTime: 5_400_000,
				intervalCount: 4,
				fragments: [
					{
						rate: 20,
						elapsedTime: 600_000,
						relativeTo: "2K",
						relativeSplitMs: 25_000,
					},
					{
						rate: 22,
						elapsedTime: 180_000,
						relativeTo: "2K",
						relativeSplitMs: 20_000,
					},
					{
						rate: 24,
						elapsedTime: 120_000,
						relativeTo: "2K",
						relativeSplitMs: 15_000,
					},
				],
			},
		],
		[
			"80', 4x9' w/5' active recovery, 3'@R20, 3'@R22, 3'@R24 (R20 2k+20'', R22 2k+17'', R24 2k+14'')",
			{
				workoutType: "time",
				elapsedTime: 4_800_000,
				intervalCount: 4,
				fragments: [
					{
						rate: 20,
						elapsedTime: 180_000,
						relativeTo: "2K",
						relativeSplitMs: 20_000,
					},
					{
						rate: 22,
						elapsedTime: 180_000,
						relativeTo: "2K",
						relativeSplitMs: 17_000,
					},
					{
						rate: 24,
						elapsedTime: 180_000,
						relativeTo: "2K",
						relativeSplitMs: 14_000,
					},
				],
			},
		],
		[
			"3x20 w/10 stroke burst at the 15', 10' and 5' marks (come off the burst taking time at the finish/release)",
			{ workoutType: "time", elapsedTime: 3_600_000, intervalCount: 3 },
		],
		[
			"3x20' w/10 stroke burst at the 15' and 5' marks",
			{ workoutType: "time", elapsedTime: 3_600_000, intervalCount: 3 },
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
		"90', 4x15' w/3' rest, 10'@R20, 3'@R22, 2'@R24 (R20@2k+25, R22@2k+20)",
		"90', 4x15' w/3' rest, 10'@R20, 3'@R22, 3'@R24 (R20@2k+25, R22@2k+20, R24@2k+15)",
		"3x20 w/10 stroke burst",
		"3x20 w/10 stroke burst at the 25' mark",
		"80', 3x12'@R24 w/5' active recovery (Target 6k/20' split)",
	])("leaves %j to the AI", (description) => {
		expect(parseWorkoutDescription(description)).toBeUndefined();
	});
});
