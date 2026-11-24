import { getUserByUserIdQuery } from "@/domain/users/queries/get-user-by-user-id/get-user-by-user-id.query";
import { getUserByUserIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getUserByUserIdProcedure = viewerProcedure
	.input(getUserByUserIdInputSchema)
	.query(({ ctx, input }) => getUserByUserIdQuery(input, ctx));
