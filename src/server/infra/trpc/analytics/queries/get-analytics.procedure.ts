import { getAnalyticsQuery } from "@/domain/analytics/queries/get-analytics/get-analytics.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getAnalyticsProcedure = viewerProcedure.query(({ ctx }) =>
	getAnalyticsQuery(undefined, ctx),
);
