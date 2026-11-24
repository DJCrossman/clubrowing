import type { AthleteRow } from "@/domain/athletes/common/map-to-athlete-dto";
import type { db } from "@/lib/db";
import type { createConcept2Service } from "@/server/services/concept2-service";
import type { createFileStorage } from "@/server/services/file-storage";
import type { createGitHubService } from "@/server/services/github-service";
import type { createPushService } from "@/server/services/push-service";
import type { createRcaService } from "@/server/services/rca-service";
import type { createStravaService } from "@/server/services/strava-service";
import type { createTaskManager } from "@/server/services/task-manager";
import type { createUserService } from "@/server/services/user-service";

type BaseContext = {
	db: typeof db;
	services: {
		strava: ReturnType<typeof createStravaService>;
		concept2: ReturnType<typeof createConcept2Service>;
		rca: ReturnType<typeof createRcaService>;
		push: ReturnType<typeof createPushService>;
		github: ReturnType<typeof createGitHubService>;
		taskManager: ReturnType<typeof createTaskManager>;
		userService: ReturnType<typeof createUserService>;
		fileStorage: ReturnType<typeof createFileStorage>;
	};
	origin: string;
};

export type SessionUser = {
	id: string;
	isAdmin: boolean;
};

export type ContextAthlete = AthleteRow;

export type Context = BaseContext & {
	user: SessionUser | null;
};

export type UnauthenticatedContext = BaseContext & {
	user: SessionUser | null;
};

export type AuthenticatedContext = BaseContext & {
	user: SessionUser;
	athlete: ContextAthlete;
};

export type AdminContext = BaseContext & {
	user: SessionUser & { isAdmin: true };
	athlete: ContextAthlete | null;
};

export type ViewerContext = BaseContext & {
	user: SessionUser;
	athlete: ContextAthlete | null;
};

export type OnboardingContext = BaseContext & {
	user: SessionUser;
	athlete: null;
};
