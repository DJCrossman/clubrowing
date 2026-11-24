import { getPendingInboxBatchesQuery } from "@/domain/activities/queries/get-pending-inbox-batches/get-pending-inbox-batches.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getPendingInboxBatchesProcedure = viewerProcedure.query(
	({ ctx }) => getPendingInboxBatchesQuery(undefined, ctx),
);
