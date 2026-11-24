import { getGroupsQuery } from "@/server/domain/groups/queries/get-groups/get-groups.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getGroupsProcedure = viewerProcedure.query(({ ctx }) =>
	getGroupsQuery(undefined, ctx),
);
