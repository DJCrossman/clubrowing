import { getActivityStrokesQuery } from "@/domain/activities/queries/get-activity-strokes/get-activity-strokes.query";
import { getActivityStrokesInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getActivityStrokesProcedure = viewerProcedure
	.input(getActivityStrokesInputSchema)
	.query(({ ctx, input }) => getActivityStrokesQuery(input, ctx));
