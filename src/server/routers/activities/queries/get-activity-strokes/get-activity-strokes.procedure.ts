import { getActivityStrokesInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/procedures";
import { getActivityStrokesQuery } from "./get-activity-strokes.query";

export const getActivityStrokesProcedure = viewerProcedure
	.input(getActivityStrokesInputSchema)
	.query(({ ctx, input }) => getActivityStrokesQuery(input, ctx));
