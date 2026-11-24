import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { getConcept2UserQuery } from "./get-concept2-user.query";

export const getConcept2UserProcedure = protectedProcedure.query(({ ctx }) =>
	getConcept2UserQuery(undefined, ctx),
);
