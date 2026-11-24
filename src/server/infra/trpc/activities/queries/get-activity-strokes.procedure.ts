import { getActivityStrokesInputSchema } from "@/schemas";
import { getActivityStrokesQuery } from "@/server/domain/activities/queries/get-activity-strokes/get-activity-strokes.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getActivityStrokesProcedure = viewerProcedure
	.input(getActivityStrokesInputSchema)
	.query(({ ctx, input }) => getActivityStrokesQuery(input, ctx));
