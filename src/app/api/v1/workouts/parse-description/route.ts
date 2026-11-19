import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObjectFromPrompt } from "@/lib/ai/generateObject";
import { PARSE_WORKOUT_DESCRIPTION_PROMPT } from "@/lib/ai/prompts/parse-workout-description.prompt";
import { requireAuth } from "@/lib/auth";
import { parseDuration } from "@/lib/parsers/parseDuration";
import { parseIntervals } from "@/lib/parsers/parseIntervals";
import { parseWorkoutDescription } from "@/lib/parsers/parseWorkoutDescription";
import {
	type CreateWorkoutFragment,
	createWorkoutFragmentSchema,
} from "@/schemas";

export interface ParseDescriptionResult {
	workoutType: "distance" | "time" | "other";
	elapsedTime?: number;
	distance?: number;
	intervalCount: number;
	fragments?: CreateWorkoutFragment[];
}

const parsedDescriptionSchema = z.object({
	workoutType: z.enum(["distance", "time", "other"]).default("other"),
	elapsedTime: z.number().optional(),
	distance: z.number().optional(),
	intervalCount: z.number().default(1),
	fragments: z.array(createWorkoutFragmentSchema).optional(),
});

const requestSchema = z.object({
	description: z.string().min(1),
});

export async function POST(request: Request) {
	try {
		await requireAuth();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsedRequest = requestSchema.safeParse(body);
	if (!parsedRequest.success) {
		return NextResponse.json(
			{ error: "description is required" },
			{ status: 400 },
		);
	}
	const { description } = parsedRequest.data;

	const parsedInCode = parseWorkoutDescription(description);
	if (parsedInCode) {
		return NextResponse.json(parsedInCode);
	}

	let ai: z.infer<typeof parsedDescriptionSchema>;
	try {
		ai = await generateObjectFromPrompt({
			prompt: `${PARSE_WORKOUT_DESCRIPTION_PROMPT}\n${description}`,
			schema: parsedDescriptionSchema,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ error: `AI generation failed: ${message}` },
			{ status: 502 },
		);
	}

	const result: ParseDescriptionResult = {
		workoutType: ai.workoutType,
		// Only a timed workout's text can stand in for a missing total: in any
		// other description the minute figures are rests and marks ("2x1k w/
		// 9'55'' active rest" came back as 64 minutes).
		elapsedTime:
			ai.workoutType === "time"
				? (getTimeWorkoutTotal(description, ai.fragments) ??
					ai.elapsedTime ??
					parseDuration(description))
				: ai.elapsedTime,
		distance: ai.distance,
		intervalCount: ai.intervalCount ?? parseIntervals(description),
		fragments: ai.fragments,
	};

	return NextResponse.json(result);
}

// The model's total is unreliable for a set written without one ("3 x 20' /
// 4' rest" came back as 10 and as 90 minutes), so the text and the pieces
// decide whenever they can.
function getTimeWorkoutTotal(
	description: string,
	fragments: CreateWorkoutFragment[] = [],
): number | undefined {
	const openingMinutes = description.match(
		/^\s*(\d+(?:\.\d+)?)\s*['’′]\s*[,\n]/,
	)?.[1];
	if (openingMinutes) {
		return Number(openingMinutes) * 60_000;
	}
	if (
		fragments.length === 0 ||
		fragments.some((fragment) => fragment.elapsedTime == null)
	) {
		return undefined;
	}
	return fragments.reduce(
		(sum, fragment) => sum + (fragment.elapsedTime ?? 0),
		0,
	);
}
