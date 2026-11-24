import { getConcept2ResultsQuery } from "@/domain/activities/queries/get-concept2-results/get-concept2-results.query";
import { getConcept2ResultsInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const getConcept2ResultsProcedure = protectedProcedure
	.input(getConcept2ResultsInputSchema)
	.query(({ ctx, input }) => getConcept2ResultsQuery(input, ctx));
