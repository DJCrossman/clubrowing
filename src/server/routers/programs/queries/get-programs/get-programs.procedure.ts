import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getProgramsQuery } from "./get-programs.query";

export const getProgramsProcedure = viewerProcedure.query(({ ctx }) =>
	getProgramsQuery(undefined, ctx),
);
