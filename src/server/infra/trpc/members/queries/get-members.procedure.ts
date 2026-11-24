import { getMembersInputSchema } from "@/schemas";
import { getMembersQuery } from "@/server/domain/members/queries/get-members/get-members.query";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const getMembersProcedure = adminProcedure
	.input(getMembersInputSchema.optional())
	.query(({ ctx, input = {} }) => getMembersQuery(input, ctx));
