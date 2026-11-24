import { getUserByIdInputSchema } from "@/schemas";
import { getUserByIdQuery } from "@/server/domain/users/queries/get-user-by-id/get-user-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getUserByIdProcedure = viewerProcedure
	.input(getUserByIdInputSchema)
	.query(({ ctx, input }) => getUserByIdQuery(input, ctx));
