import { getProgramsQuery } from "@/server/domain/programs/queries/get-programs/get-programs.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getProgramsProcedure = viewerProcedure.query(({ ctx }) =>
	getProgramsQuery(undefined, ctx),
);
