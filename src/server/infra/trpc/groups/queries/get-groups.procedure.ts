import { getGroupsQuery } from "@/domain/groups/queries/get-groups/get-groups.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getGroupsProcedure = viewerProcedure.query(({ ctx }) =>
	getGroupsQuery(undefined, ctx),
);
