import { getStatusQuery } from "@/domain/notifications/queries/get-status/get-status.query";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const getStatusProcedure = protectedProcedure.query(({ ctx }) =>
	getStatusQuery(undefined, ctx),
);
