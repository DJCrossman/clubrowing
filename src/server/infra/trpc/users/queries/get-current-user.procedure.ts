import { getCurrentUserQuery } from "@/domain/users/queries/get-current-user/get-current-user.query";
import { publicProcedure } from "@/trpc/procedures/public.procedure";

export const getCurrentUserProcedure = publicProcedure.query(({ ctx }) =>
	getCurrentUserQuery(undefined, ctx),
);
