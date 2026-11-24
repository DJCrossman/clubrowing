import { getErgByIdQuery } from "@/domain/ergs/queries/get-erg-by-id/get-erg-by-id.query";
import { getErgByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getErgByIdProcedure = viewerProcedure
	.input(getErgByIdInputSchema)
	.query(({ ctx, input }) => getErgByIdQuery(input, ctx));
