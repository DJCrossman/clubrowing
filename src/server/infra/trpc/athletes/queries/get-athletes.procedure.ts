import {
	getAthletesInputSchema,
	getAthletesQuery,
} from "@/domain/athletes/queries/get-athletes/get-athletes.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getAthletesProcedure = viewerProcedure
	.input(getAthletesInputSchema.optional())
	.query(({ ctx, input = {} }) => getAthletesQuery(input, ctx));
