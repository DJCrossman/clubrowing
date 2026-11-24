import { getMyGroupsQuery } from "@/domain/groups/queries/get-my-groups/get-my-groups.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getMyGroupsProcedure = viewerProcedure.query(({ ctx }) =>
	getMyGroupsQuery(undefined, ctx),
);
