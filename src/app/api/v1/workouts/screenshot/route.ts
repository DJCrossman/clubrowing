import { NextResponse } from "next/server";
import { z } from "zod";
import { parseImage } from "@/lib/ai/parseImage";
import { PARSE_WORKOUT_SCREENSHOT_PROMPT } from "@/lib/ai/prompts/parse-workout-screenshot.prompt";
import { requireAuth } from "@/lib/auth";
import { parseDuration } from "@/lib/parsers/parseDuration";
import { parseIntensity } from "@/lib/parsers/parseIntensity";
import { parseIntervals } from "@/lib/parsers/parseIntervals";
import { type CreateWorkout, workoutCoreSchema } from "@/schemas";

const aiWorkoutsSchema = z.object({
	workouts: z.array(
		workoutCoreSchema
			.omit({ intervalCount: true, intensityCategory: true, zoneMinutes: true })
			.extend({
				intervalCount: z.number().optional(),
				intensityCategory: workoutCoreSchema.shape.intensityCategory.optional(),
			}),
	),
});

export async function POST(request: Request) {
	try {
		await requireAuth();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get("file");

	if (!(file instanceof File)) {
		return NextResponse.json({ error: "file is required" }, { status: 400 });
	}

	const arrayBuffer = await file.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString("base64");

	let aiWorkouts: z.infer<typeof aiWorkoutsSchema>["workouts"];
	try {
		({ workouts: aiWorkouts } = await parseImage({
			imageBase64: base64,
			prompt: PARSE_WORKOUT_SCREENSHOT_PROMPT,
			schema: aiWorkoutsSchema,
		}));
	} catch (error) {
		return NextResponse.json(
			{ error: `No workouts could be read from the image. ${error}` },
			{ status: 400 },
		);
	}

	const workouts = await Promise.allSettled(
		aiWorkouts.map(async (item) => {
			const description = item.description.replace(/\\n/g, "\n");
			return workoutCoreSchema.parse({
				...item,
				description,
				elapsedTime: item.elapsedTime ?? parseDuration(description),
				intervalCount: item.intervalCount ?? parseIntervals(description),
				intensityCategory:
					item.intensityCategory ?? parseIntensity(description),
			});
		}),
	);

	const serializable: UploadWorkoutScreenshotResult = {
		workouts: workouts.map((w) =>
			w.status === "fulfilled"
				? w
				: {
						status: "rejected",
						reason: {
							message:
								w.reason instanceof Error ? w.reason.message : String(w.reason),
						} as unknown as Error,
					},
		),
	};
	return NextResponse.json(serializable);
}
export interface UploadWorkoutScreenshotResult {
	workouts: PromiseSettledResult<CreateWorkout>[];
}
