import { getConcept2UserQuery } from "@/domain/activities/queries/get-concept2-user/get-concept2-user.query";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const getConcept2UserProcedure = protectedProcedure.query(({ ctx }) =>
	getConcept2UserQuery(undefined, ctx),
);
