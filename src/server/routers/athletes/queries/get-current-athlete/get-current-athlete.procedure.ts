import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getCurrentAthleteQuery } from "./get-current-athlete.query";

export const getCurrentAthleteProcedure = viewerProcedure.query(({ ctx }) =>
	getCurrentAthleteQuery(undefined, ctx),
);
