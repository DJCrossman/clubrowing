import { getUserByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getUserByIdQuery } from "./get-user-by-id.query";

export const getUserByIdProcedure = viewerProcedure
	.input(getUserByIdInputSchema)
	.query(({ ctx, input }) => getUserByIdQuery(input, ctx));
