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

const FILLER_WORDS =
	/(?:@\s*)?\bmax rate\b|\b(?:steady state|ss|easy|row|erg|time trial|tt|ut2|ut1|warm[ -]?up)\b/g;
const MEASURE = String.raw`(\d+(?:\.\d+)?)\s*(minutes?|mins?|km|k|m|')`;
const REST = String.raw`(?:w\/|\/|r)\s*\d+(?:\.\d+)?\s*(?:'|minutes?|mins?)(?:\s*(?:rest|r))?`;
const MEASURE_ONLY = new RegExp(`^${MEASURE}$`);
const REPEATS = new RegExp(
	String.raw`^(?:(\d+)\s*x\s*)?${MEASURE}(\s*${REST})?$`,
);
const RATE_PIECE = new RegExp(String.raw`^${MEASURE}\s*@\s*r\s*(\d+)$`);

export function parseWorkoutDescription(
	description: string,
): ParseDescriptionResult | undefined {
	const normalized = description
		.toLowerCase()
		.replace(/[’′]/g, "'")
		.replace(/×/g, "x");
	const [first, ...pieceSegments] = normalized
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

	const workout =
		pieceSegments.length === 0
			? getRepeatedPieces(first)
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
