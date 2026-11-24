import { getAthleteByIdQuery } from "@/domain/athletes/queries/get-athlete-by-id/get-athlete-by-id.query";
import { getAthleteByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getAthleteByIdProcedure = viewerProcedure
	.input(getAthleteByIdInputSchema)
	.query(({ ctx, input }) => getAthleteByIdQuery(input, ctx));
