import { getMembersQuery } from "@/domain/members/queries/get-members/get-members.query";
import { getMembersInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const getMembersProcedure = adminProcedure
	.input(getMembersInputSchema.optional())
	.query(({ ctx, input = {} }) => getMembersQuery(input, ctx));
