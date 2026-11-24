import { getAnalyticsQuery } from "@/server/domain/analytics/queries/get-analytics/get-analytics.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getAnalyticsProcedure = viewerProcedure.query(({ ctx }) =>
	getAnalyticsQuery(undefined, ctx),
);
