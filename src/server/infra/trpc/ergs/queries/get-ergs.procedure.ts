import {
	getErgsInputSchema,
	getErgsQuery,
} from "@/server/domain/ergs/queries/get-ergs/get-ergs.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getErgsProcedure = viewerProcedure
	.input(getErgsInputSchema.optional())
	.query(({ ctx, input = {} }) => getErgsQuery(input, ctx));
