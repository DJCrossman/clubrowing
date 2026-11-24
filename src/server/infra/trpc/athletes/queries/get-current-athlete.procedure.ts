import { getCurrentAthleteQuery } from "@/domain/athletes/queries/get-current-athlete/get-current-athlete.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getCurrentAthleteProcedure = viewerProcedure.query(({ ctx }) =>
	getCurrentAthleteQuery(undefined, ctx),
);
