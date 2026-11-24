import {
	getBoatsInputSchema,
	getBoatsQuery,
} from "@/domain/boats/queries/get-boats/get-boats.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getBoatsProcedure = viewerProcedure
	.input(getBoatsInputSchema.optional())
	.query(({ ctx, input = {} }) => getBoatsQuery(input, ctx));
