import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getPendingInboxBatchesQuery } from "./get-pending-inbox-batches.query";

export const getPendingInboxBatchesProcedure = viewerProcedure.query(
	({ ctx }) => getPendingInboxBatchesQuery(undefined, ctx),
);
