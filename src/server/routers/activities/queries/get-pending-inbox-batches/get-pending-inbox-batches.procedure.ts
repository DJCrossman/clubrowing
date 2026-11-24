import { viewerProcedure } from "@/server/procedures";
import { getPendingInboxBatchesQuery } from "./get-pending-inbox-batches.query";

export const getPendingInboxBatchesProcedure = viewerProcedure.query(
	({ ctx }) => getPendingInboxBatchesQuery(undefined, ctx),
);
