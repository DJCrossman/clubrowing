import { getUserByIdQuery } from "@/domain/users/queries/get-user-by-id/get-user-by-id.query";
import { getUserByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getUserByIdProcedure = viewerProcedure
	.input(getUserByIdInputSchema)
	.query(({ ctx, input }) => getUserByIdQuery(input, ctx));
