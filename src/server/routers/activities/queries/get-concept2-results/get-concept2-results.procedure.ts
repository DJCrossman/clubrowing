import { getConcept2ResultsInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { getConcept2ResultsQuery } from "./get-concept2-results.query";

export const getConcept2ResultsProcedure = protectedProcedure
	.input(getConcept2ResultsInputSchema)
	.query(({ ctx, input }) => getConcept2ResultsQuery(input, ctx));
