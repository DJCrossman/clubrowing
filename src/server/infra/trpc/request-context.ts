import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { isDefaultOrgAdmin } from "@/server/clerk/default-organization";
import type { Context } from "@/server/domain/common/context";
import { createConcept2Service } from "@/server/services/concept2-service";
import { createGitHubService } from "@/server/services/github-service";
import { createPushService } from "@/server/services/push-service";
import { createRcaService } from "@/server/services/rca-service";
import { createStravaService } from "@/server/services/strava-service";

export async function createRequestContext(_opts?: {
	req?: Request;
}): Promise<Context> {
	const session = await auth();
	const services = {
		strava: createStravaService(),
		concept2: createConcept2Service(),
		rca: createRcaService(),
		push: createPushService({ db }),
		github: createGitHubService(),
	};

	if (!session.userId) {
		return { user: null, db, services };
	}

	const isAdmin = await isDefaultOrgAdmin(session.userId);

	return {
		user: { id: session.userId, isAdmin },
		db,
		services,
	};
}
