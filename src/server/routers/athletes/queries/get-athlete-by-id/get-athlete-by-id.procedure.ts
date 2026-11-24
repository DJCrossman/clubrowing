import { getAthleteByIdInputSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getAthleteByIdQuery } from "./get-athlete-by-id.query";

export const getAthleteByIdProcedure = viewerProcedure
	.input(getAthleteByIdInputSchema)
	.query(({ ctx, input }) => getAthleteByIdQuery(input, ctx));
