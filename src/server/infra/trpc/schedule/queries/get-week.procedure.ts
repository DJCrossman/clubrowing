import { getWeekQuery } from "@/domain/schedule/queries/get-week/get-week.query";
import { getWeekInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getWeekProcedure = viewerProcedure
	.input(getWeekInputSchema)
	.query(({ ctx, input }) => getWeekQuery(input, ctx));
