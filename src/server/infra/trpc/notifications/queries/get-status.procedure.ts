import { getStatusQuery } from "@/server/domain/notifications/queries/get-status/get-status.query";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const getStatusProcedure = protectedProcedure.query(({ ctx }) =>
	getStatusQuery(undefined, ctx),
);
