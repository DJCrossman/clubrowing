import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getBoatsInputSchema, getBoatsQuery } from "./get-boats.query";

export const getBoatsProcedure = viewerProcedure
	.input(getBoatsInputSchema.optional())
	.query(({ ctx, input = {} }) => getBoatsQuery(input, ctx));
