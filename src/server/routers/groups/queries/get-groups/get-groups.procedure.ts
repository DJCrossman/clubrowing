import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getGroupsQuery } from "./get-groups.query";

export const getGroupsProcedure = viewerProcedure.query(({ ctx }) =>
	getGroupsQuery(undefined, ctx),
);
