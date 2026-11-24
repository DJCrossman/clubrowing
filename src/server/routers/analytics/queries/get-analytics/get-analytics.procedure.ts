import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getAnalyticsQuery } from "./get-analytics.query";

export const getAnalyticsProcedure = viewerProcedure.query(({ ctx }) =>
	getAnalyticsQuery(undefined, ctx),
);
