import type { ParseDescriptionResult } from "@/app/api/v1/workouts/parse-description/route";
import type { CreateWorkoutFragment } from "@/schemas";

interface Measure {
	kind: "time" | "distance";
	amount: number;
}

interface Workout {
	measure: Measure;
	intervalCount: number;
	fragments?: CreateWorkoutFragment[];
}

interface PaceTarget {
	relativeTo: "2K" | "6K";
	relativeSplitMs: number;
}

const FILLER_WORDS =
	/(?:@\s*)?\bmax rate\b|\b(?:steady state|ss|easy|row|erg|time trial|tt|ut2|ut1|warm[ -]?up)\b/g;
const MEASURE = String.raw`(\d+(?:\.\d+)?)\s*(minutes?|mins?|km|k|m|')`;
const REST = String.raw`(?:w\/|\/|r)\s*\d+(?:\.\d+)?\s*(?:'|minutes?|mins?)(?:\s*(?:rest|r))?`;
const MEASURE_ONLY = new RegExp(`^${MEASURE}$`);
const REPEATS = new RegExp(
	String.raw`^(?:(\d+)\s*x\s*)?${MEASURE}(\s*${REST})?$`,
);
const RATE_PIECE = new RegExp(String.raw`^${MEASURE}\s*@\s*r\s*(\d+)$`);
const OPEN_PIECE = new RegExp(String.raw`^${MEASURE}\s+open$`);
const PACED_SET = new RegExp(
	String.raw`^(\d+)\s*x\s*${MEASURE}\s*w\/\s*\d+(?:\.\d+)?\s*'\s*(?:rest|active recovery)$`,
);
const PACE_TARGET =
	/^(?:r\s*(\d+)|open)\s*@?\s*(2k|6k)\s*([+-])\s*(\d+)\s*(?:''|")?$/;
const TRAILING_BRACKET = /\s*\(([^()]*)\)\s*$/;
const BURST_NOTE =
	/\s*w\/\s*\d+\s*stroke bursts?\s+at the\s+(\d+\s*'(?:\s*(?:,|,?\s*and)\s*\d+\s*')*)\s*marks?\b/;
const UNITLESS_REPEATS = /^(\d+)\s*x\s*(\d+)$/;

export function parseWorkoutDescription(
	description: string,
): ParseDescriptionResult | undefined {
	const normalized = description
		.toLowerCase()
		.replace(/[’′]/g, "'")
		.replace(/×/g, "x");
	const bracket = normalized.match(TRAILING_BRACKET);
	const targets = bracket ? getPaceTargets(bracket[1]) : undefined;
	// A trailing bracket without numbers is coaching prose, not part of the
	// workout; one with numbers that are not pace targets stays to be judged.
	const workoutText =
		bracket && (targets || !/\d/.test(bracket[1]))
			? normalized.slice(0, bracket.index)
			: normalized;
	const burstMarks = workoutText.match(BURST_NOTE)?.[1];
	const [first, ...pieceSegments] = workoutText
		.replace(BURST_NOTE, "")
		.split(/[,;\n]/)
		.map((segment) =>
			segment.replace(FILLER_WORDS, " ").replace(/\s+/g, " ").trim(),
		)
		.filter(Boolean);
	if (!first) {
		return undefined;
	}
	// Filler beside a session total is ambiguous: in "60', 10' warm up, 4x10'"
	// the warm-up may or may not count as a piece.
	if (pieceSegments.length > 0 && normalized.match(FILLER_WORDS)) {
		return undefined;
	}

	const workout = targets
		? getPacedSets(first, pieceSegments, targets)
		: pieceSegments.length === 0
			? (getRepeatedPieces(first) ?? getBurstMarkedRepeats(first, burstMarks))
			: getSessionPieces(first, pieceSegments);
	if (!workout) {
		return undefined;
	}
	return {
		workoutType: workout.measure.kind,
		...(workout.measure.kind === "time"
			? { elapsedTime: workout.measure.amount }
			: { distance: workout.measure.amount }),
		intervalCount: workout.intervalCount,
		...(workout.fragments && { fragments: workout.fragments }),
	};
}

function getRepeatedPieces(expression: string): Workout | undefined {
	let measure: Measure | undefined;
	let intervalCount = 0;
	for (const part of expression.split("+")) {
		const match = part.trim().match(REPEATS);
		if (!match) {
			return undefined;
		}
		const [, count = "1", value, unit, rest] = match;
		const piece = measurePiece(value, unit);
		// Rest only means something between repeats.
		if (!piece || Number(count) === 0 || (rest && Number(count) < 2)) {
			return undefined;
		}
		// "2x20' + 2000m" has no single total.
		if (measure && measure.kind !== piece.kind) {
			return undefined;
		}
		measure = {
			kind: piece.kind,
			amount: (measure?.amount ?? 0) + Number(count) * piece.amount,
		};
		intervalCount += Number(count);
	}
	return measure && { measure, intervalCount };
}

function measurePiece(value: string, unit: string): Measure | undefined {
	const amount = Number(value);
	if (amount === 0) {
		return undefined;
	}
	if (unit === "'" || unit.startsWith("min")) {
		return { kind: "time", amount: Math.round(amount * 60_000) };
	}
	if (unit === "m") {
		// "60m" is more likely an hour than sixty metres.
		return amount < 100 ? undefined : { kind: "distance", amount };
	}
	return { kind: "distance", amount: Math.round(amount * 1000) };
}

function getSessionPieces(
	totalSegment: string,
	pieceSegments: string[],
): Workout | undefined {
	const totalMatch = totalSegment.match(MEASURE_ONLY);
	const total = totalMatch && measurePiece(totalMatch[1], totalMatch[2]);
	if (!total) {
		return undefined;
	}
	if (pieceSegments.some((segment) => segment.includes("@"))) {
		return getRateBreakdown(total, pieceSegments);
	}
	// Only a time opens a session total; "10k, 2x5k" could equally be a
	// warm-up followed by the work.
	if (total.kind !== "time") {
		return undefined;
	}

	let intervalCount = 0;
	let piecesAmount = 0;
	for (const segment of pieceSegments) {
		const set = getRepeatedPieces(segment);
		if (!set || set.measure.kind !== "time") {
			return undefined;
		}
		intervalCount += set.intervalCount;
		piecesAmount += set.measure.amount;
	}
	// Pieces that outlast the opening number mean it is not a session total.
	if (piecesAmount > total.amount) {
		return undefined;
	}
	return { measure: total, intervalCount };
}

function getRateBreakdown(
	total: Measure,
	pieceSegments: string[],
): Workout | undefined {
	const fragments: CreateWorkoutFragment[] = [];
	let piecesAmount = 0;
	for (const segment of pieceSegments) {
		const match = segment.match(RATE_PIECE);
		const piece = match && measurePiece(match[1], match[2]);
		if (!match || !piece || piece.kind !== total.kind) {
			return undefined;
		}
		piecesAmount += piece.amount;
		fragments.push({
			rate: Number(match[3]),
			...(piece.kind === "time"
				? { elapsedTime: piece.amount }
				: { distance: piece.amount }),
			relativeTo: "2K",
			relativeSplitMs: 0,
		});
	}
	if (piecesAmount !== total.amount) {
		return undefined;
	}
	return { measure: total, intervalCount: fragments.length, fragments };
}

function getPaceTargets(bracket: string): Map<string, PaceTarget> | undefined {
	const targets = new Map<string, PaceTarget>();
	for (const entry of bracket.split(",")) {
		const match = entry.trim().match(PACE_TARGET);
		if (!match) {
			return undefined;
		}
		const [, rate = "open", benchmark, sign, seconds] = match;
		if (targets.has(rate)) {
			return undefined;
		}
		targets.set(rate, {
			relativeTo: benchmark === "6k" ? "6K" : "2K",
			relativeSplitMs: Number(`${sign}${seconds}`) * 1000,
		});
	}
	return targets;
}

function getPacedSets(
	totalSegment: string,
	pieceSegments: string[],
	targets: Map<string, PaceTarget>,
): Workout | undefined {
	const totalMatch = totalSegment.match(MEASURE_ONLY);
	const total = totalMatch && measurePiece(totalMatch[1], totalMatch[2]);
	const [setSegment, ...rateSegments] = pieceSegments;
	const setMatch = setSegment?.match(PACED_SET);
	const set = setMatch && measurePiece(setMatch[2], setMatch[3]);
	if (!total || total.kind !== "time" || !set || set.kind !== "time") {
		return undefined;
	}
	const intervalCount = Number(setMatch[1]);
	if (intervalCount === 0 || intervalCount * set.amount > total.amount) {
		return undefined;
	}

	const fragments: CreateWorkoutFragment[] = [];
	const usedRates = new Set<string>();
	let piecesAmount = 0;
	for (const segment of rateSegments) {
		const rateMatch = segment.match(RATE_PIECE);
		const match = rateMatch ?? segment.match(OPEN_PIECE);
		const piece = match && measurePiece(match[1], match[2]);
		const rate = rateMatch?.[3] ?? "open";
		const target = targets.get(rate);
		if (!piece || piece.kind !== "time" || !target) {
			return undefined;
		}
		usedRates.add(rate);
		piecesAmount += piece.amount;
		fragments.push({
			...(rateMatch && { rate: Number(rate) }),
			elapsedTime: piece.amount,
			...target,
		});
	}
	if (piecesAmount !== set.amount || usedRates.size !== targets.size) {
		return undefined;
	}
	return { measure: total, intervalCount, fragments };
}

function getBurstMarkedRepeats(
	expression: string,
	burstMarks: string | undefined,
): Workout | undefined {
	const match = expression.match(UNITLESS_REPEATS);
	if (!match || !burstMarks) {
		return undefined;
	}
	const [, count, minutes] = match;
	// Burst marks in minutes that all fall inside the piece say it is minutes too.
	if (
		[...burstMarks.matchAll(/\d+/g)].some(
			([mark]) => Number(mark) >= Number(minutes),
		)
	) {
		return undefined;
	}
	const piece = measurePiece(minutes, "'");
	if (!piece || Number(count) === 0) {
		return undefined;
	}
	return {
		measure: { kind: "time", amount: Number(count) * piece.amount },
		intervalCount: Number(count),
	};
}
