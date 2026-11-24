import { getConcept2UserQuery } from "@/server/domain/activities/queries/get-concept2-user/get-concept2-user.query";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const getConcept2UserProcedure = protectedProcedure.query(({ ctx }) =>
	getConcept2UserQuery(undefined, ctx),
);
