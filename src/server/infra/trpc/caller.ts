import "server-only";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { appRouter } from "@/server/infra/routes";
import { createRequestContext } from "./request-context";

export async function createServerCaller() {
	const ctx = await createRequestContext();
	return appRouter.createCaller(ctx);
}

export async function createAdminCaller() {
	const ctx = await createRequestContext();
	if (!ctx.user?.isAdmin) {
		redirect(routes.dashboard.home());
	}
	return appRouter.createCaller(ctx);
}
