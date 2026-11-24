import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getAthletesInputSchema, getAthletesQuery } from "./get-athletes.query";

export const getAthletesProcedure = viewerProcedure
	.input(getAthletesInputSchema.optional())
	.query(({ ctx, input = {} }) => getAthletesQuery(input, ctx));
