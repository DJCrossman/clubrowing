import { getCurrentAthleteQuery } from "@/server/domain/athletes/queries/get-current-athlete/get-current-athlete.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getCurrentAthleteProcedure = viewerProcedure.query(({ ctx }) =>
	getCurrentAthleteQuery(undefined, ctx),
);
