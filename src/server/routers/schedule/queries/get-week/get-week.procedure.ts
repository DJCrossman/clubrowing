import { getWeekInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getWeekQuery } from "./get-week.query";

export const getWeekProcedure = viewerProcedure
	.input(getWeekInputSchema)
	.query(({ ctx, input }) => getWeekQuery(input, ctx));
