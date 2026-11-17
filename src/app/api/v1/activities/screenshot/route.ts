import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseImage } from "@/lib/ai/parseImage";
import { PARSE_CONCEPT2_SCREENSHOT_PROMPT } from "@/lib/ai/prompts";
import { requireAuth } from "@/lib/auth";
import { createActivitySchema, workoutCoreSchema } from "@/schemas";

const aiActivitySchema = z.object({
	name: z.string(),
	startDate: z.string(),
	workoutType: workoutCoreSchema.shape.workoutType,
	elapsedTime: z.number(),
	distance: z.number(),
});

export async function POST(request: Request) {
	try {
		await requireAuth();
	} catch {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		const athleteId = formData.get("athleteId");
		const ergId = formData.get("ergId");

		if (!(file instanceof File)) {
			return NextResponse.json(
				{ success: false, error: "file is required" },
				{ status: 400 },
			);
		}
		if (typeof athleteId !== "string") {
			return NextResponse.json(
				{ success: false, error: "athleteId is required" },
				{ status: 400 },
			);
		}

		const arrayBuffer = await file.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString("base64");

		const aiActivity = await parseImage({
			imageBase64: base64,
			prompt: PARSE_CONCEPT2_SCREENSHOT_PROMPT,
			schema: aiActivitySchema,
		});

		const activityData = {
			...aiActivity,
			type: "erg",
			timezone: DateTime.now().zoneName,
			athleteId,
			ergId: typeof ergId === "string" && ergId.length > 0 ? ergId : undefined,
			workoutId: undefined,
		};

		const validatedActivity = createActivitySchema.parse(activityData);

		return NextResponse.json({ success: true, data: validatedActivity });
	} catch (error) {
		console.error("Error uploading activity screenshot:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
		}
		return NextResponse.json({ success: false });
	}
}
