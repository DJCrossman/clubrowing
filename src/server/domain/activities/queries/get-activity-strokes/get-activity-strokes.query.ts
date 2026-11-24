import { canViewActivity } from "@/domain/activities/common/can-view-activity";
import { parseStoredJson } from "@/domain/activities/common/cross-source-activity";
import { getConcept2AccessTokenForAthlete } from "@/domain/activities/common/get-concept2-access-token-for-athlete";
import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import { createLogger } from "@/lib/logger";
import {
	type Concept2Strokes,
	concept2ActivitySchema,
	concept2StrokesSchema,
	type GetActivityStrokesInput,
} from "@/schemas";

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
			isHidden: true,
			conceptTwoId: true,
			conceptTwoData: true,
			strokes: { select: { strokes: true } },
		},
	});
	if (!row) return null;
	if (!canViewActivity({ activity: row, user, athlete })) {
		throw new DomainError(
			"FORBIDDEN",
			"Cannot view another athlete's activity",
		);
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
