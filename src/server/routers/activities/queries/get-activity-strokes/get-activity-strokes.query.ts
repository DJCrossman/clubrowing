import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";
import {
	type Concept2Strokes,
	concept2ActivitySchema,
	concept2StrokesSchema,
	type GetActivityStrokesInput,
} from "@/schemas";
import type { ViewerContext } from "@/server/context";
import { parseStoredJson } from "@/server/routers/activities/common/cross-source-activity";
import { getConcept2AccessTokenForAthlete } from "@/server/routers/activities/common/get-concept2-access-token-for-athlete";

const logger = createLogger("activities.strokes");

export async function getActivityStrokesQuery(
	input: GetActivityStrokesInput,
	{
		db,
		services,
		user,
		athlete,
	}: Pick<ViewerContext, "db" | "services" | "user" | "athlete">,
): Promise<Concept2Strokes | null> {
	const row = await db.activity.findUnique({
		where: { id: input.id },
		select: {
			id: true,
			athleteId: true,
			conceptTwoId: true,
			conceptTwoData: true,
			strokes: { select: { strokes: true } },
		},
	});
	if (!row) return null;
	if (!user.isAdmin && row.athleteId !== athlete?.id) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Cannot view another athlete's activity",
		});
	}

	const stored = row.strokes
		? concept2StrokesSchema.safeParse(row.strokes.strokes).data
		: undefined;
	if (stored) return stored;

	if (
		row.conceptTwoId === null ||
		!parseStoredJson({
			schema: concept2ActivitySchema.pick({ stroke_data: true }),
			raw: row.conceptTwoData,
		})?.stroke_data
	) {
		return null;
	}

	const token = await getConcept2AccessTokenForAthlete({
		db,
		services,
		athleteId: row.athleteId,
	});
	if (!token) {
		logger.warn("no Concept2 token — strokes not fetched", {
			activityId: row.id,
		});
		return null;
	}

	const strokes = await services.concept2
		.fetchStrokes(token, row.conceptTwoId)
		.catch((error: unknown) => {
			logger.warn("strokes fetch threw", {
				activityId: row.id,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		});
	if (!strokes?.length) {
		logger.warn("no strokes returned", { activityId: row.id });
		return null;
	}

	await db.activity_strokes.upsert({
		where: { activityId: row.id },
		create: { activityId: row.id, strokes },
		update: {},
	});
	return strokes;
}
