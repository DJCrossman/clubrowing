import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { getStatusQuery } from "./get-status.query";

export const getStatusProcedure = protectedProcedure.query(({ ctx }) =>
	getStatusQuery(undefined, ctx),
);
