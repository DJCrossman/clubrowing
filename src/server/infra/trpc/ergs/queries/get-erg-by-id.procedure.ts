import { getErgByIdInputSchema } from "@/schemas";
import { getErgByIdQuery } from "@/server/domain/ergs/queries/get-erg-by-id/get-erg-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getErgByIdProcedure = viewerProcedure
	.input(getErgByIdInputSchema)
	.query(({ ctx, input }) => getErgByIdQuery(input, ctx));
