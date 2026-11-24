import { getUserByUserIdInputSchema } from "@/schemas";
import { getUserByUserIdQuery } from "@/server/domain/users/queries/get-user-by-user-id/get-user-by-user-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getUserByUserIdProcedure = viewerProcedure
	.input(getUserByUserIdInputSchema)
	.query(({ ctx, input }) => getUserByUserIdQuery(input, ctx));
