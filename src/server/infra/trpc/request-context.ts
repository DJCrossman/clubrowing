import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import type { Context } from "@/domain/common/context";
import { db } from "@/lib/db";
import { isDefaultOrgAdmin } from "@/server/clerk/default-organization";
import { createConcept2Service } from "@/server/services/concept2-service";
import { createGitHubService } from "@/server/services/github-service";
import { createPushService } from "@/server/services/push-service";
import { createRcaService } from "@/server/services/rca-service";
import { createStravaService } from "@/server/services/strava-service";
import { createTaskManager } from "@/server/services/task-manager";

export async function createRequestContext(_opts?: {
	req?: Request;
}): Promise<Context> {
	const session = await auth();
	const origin = await getRequestOrigin();
	const services = {
		strava: createStravaService(),
		concept2: createConcept2Service(),
		rca: createRcaService(),
		push: createPushService({ db }),
		github: createGitHubService(),
		taskManager: createTaskManager(),
	};

	if (!session.userId) {
		return { user: null, db, services, origin };
	}

	const isAdmin = await isDefaultOrgAdmin(session.userId);

	return {
		user: { id: session.userId, isAdmin },
		db,
		services,
		origin,
	};
}

async function getRequestOrigin(): Promise<string> {
	const requestHeaders = await headers();
	const host =
		requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() ||
		requestHeaders.get("host") ||
		"localhost:3000";
	const protocol =
		requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() ||
		(host.startsWith("localhost") ? "http" : "https");
	return `${protocol}://${host}`;
}
