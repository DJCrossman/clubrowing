import { getCurrentUserQuery } from "@/server/domain/users/queries/get-current-user/get-current-user.query";
import { publicProcedure } from "@/server/infra/trpc/procedures/public.procedure";

export const getCurrentUserProcedure = publicProcedure.query(({ ctx }) =>
	getCurrentUserQuery(undefined, ctx),
);
