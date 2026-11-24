import {
	getErgsInputSchema,
	getErgsQuery,
} from "@/domain/ergs/queries/get-ergs/get-ergs.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getErgsProcedure = viewerProcedure
	.input(getErgsInputSchema.optional())
	.query(({ ctx, input = {} }) => getErgsQuery(input, ctx));
