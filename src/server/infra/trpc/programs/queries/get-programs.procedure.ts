import { getProgramsQuery } from "@/domain/programs/queries/get-programs/get-programs.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getProgramsProcedure = viewerProcedure.query(({ ctx }) =>
	getProgramsQuery(undefined, ctx),
);
