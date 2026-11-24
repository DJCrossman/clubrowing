import { getWeekInputSchema } from "@/schemas";
import { getWeekQuery } from "@/server/domain/schedule/queries/get-week/get-week.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getWeekProcedure = viewerProcedure
	.input(getWeekInputSchema)
	.query(({ ctx, input }) => getWeekQuery(input, ctx));
