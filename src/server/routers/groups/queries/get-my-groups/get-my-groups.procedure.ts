import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getMyGroupsQuery } from "./get-my-groups.query";

export const getMyGroupsProcedure = viewerProcedure.query(({ ctx }) =>
	getMyGroupsQuery(undefined, ctx),
);
