import {
	getBoatsInputSchema,
	getBoatsQuery,
} from "@/server/domain/boats/queries/get-boats/get-boats.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getBoatsProcedure = viewerProcedure
	.input(getBoatsInputSchema.optional())
	.query(({ ctx, input = {} }) => getBoatsQuery(input, ctx));
