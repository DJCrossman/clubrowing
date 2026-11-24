import { getActivityStrokesInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getActivityStrokesQuery } from "./get-activity-strokes.query";

export const getActivityStrokesProcedure = viewerProcedure
	.input(getActivityStrokesInputSchema)
	.query(({ ctx, input }) => getActivityStrokesQuery(input, ctx));
