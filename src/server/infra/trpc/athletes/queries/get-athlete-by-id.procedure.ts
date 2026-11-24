import { getAthleteByIdInputSchema } from "@/schemas";
import { getAthleteByIdQuery } from "@/server/domain/athletes/queries/get-athlete-by-id/get-athlete-by-id.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getAthleteByIdProcedure = viewerProcedure
	.input(getAthleteByIdInputSchema)
	.query(({ ctx, input }) => getAthleteByIdQuery(input, ctx));
