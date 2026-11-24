import { publicProcedure } from "@/server/infra/trpc/procedures/public.procedure";
import { getCurrentUserQuery } from "./get-current-user.query";

export const getCurrentUserProcedure = publicProcedure.query(({ ctx }) =>
	getCurrentUserQuery(undefined, ctx),
);
