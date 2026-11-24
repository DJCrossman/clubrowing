import type { IntegrationSource } from "@/generated/prisma/client";
import { paginate } from "@/lib/pagination";
import type { ViewerContext } from "@/server/context";
import {
	type ActivityInboxDto,
	mapToInboxDto,
} from "../../common/map-to-inbox-dto";

const STALE_RUNNING_MS = 15 * 60 * 1000;
const STALE_PENDING_MS = 5 * 60 * 1000;

const SOURCES: IntegrationSource[] = ["strava", "concept2"];

const NO_PENDING_BATCHES = {
	...paginate<ActivityInboxDto>({ data: [], totalCount: 0 }),
	latestBySource: { strava: null, concept2: null },
};

export async function getPendingInboxBatchesQuery(
	_input: undefined,
	{ db, athlete }: Pick<ViewerContext, "db" | "athlete">,
) {
	if (!athlete) return NO_PENDING_BATCHES;
	const now = new Date();
	await db.activity_inbox.updateMany({
		where: {
			athleteId: athlete.id,
			status: "running",
			receivedAt: { lt: new Date(now.getTime() - STALE_RUNNING_MS) },
		},
		data: {
			status: "failed",
			completedAt: now,
			errorMessage: "Sync timed out",
		},
	});
	await db.activity_inbox.updateMany({
		where: {
			athleteId: athlete.id,
			status: "pending",
			receivedAt: { lt: new Date(now.getTime() - STALE_PENDING_MS) },
		},
		data: {
			status: "failed",
			completedAt: now,
			errorMessage: "Sync was never picked up",
		},
	});

	const [rows, totalCount, ...latestPerSource] = await Promise.all([
		db.activity_inbox.findMany({
			where: {
				athleteId: athlete.id,
				status: { in: ["pending", "running"] },
			},
			orderBy: { receivedAt: "desc" },
		}),
		db.activity_inbox.count({
			where: {
				athleteId: athlete.id,
				status: { in: ["pending", "running"] },
			},
		}),
		...SOURCES.map((source) =>
			db.activity_inbox.findFirst({
				where: { athleteId: athlete.id, source },
				orderBy: { receivedAt: "desc" },
				select: { source: true, receivedAt: true },
			}),
		),
	]);

	const latestBySource = {} as Record<IntegrationSource, string | null>;
	for (const source of SOURCES) latestBySource[source] = null;
	for (const entry of latestPerSource) {
		if (entry) latestBySource[entry.source] = entry.receivedAt.toISOString();
	}

	const data = rows.map(mapToInboxDto);
	return { ...paginate({ data, totalCount }), latestBySource };
}
