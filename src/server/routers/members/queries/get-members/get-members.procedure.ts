import { getMembersInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { getMembersQuery } from "./get-members.query";

export const getMembersProcedure = adminProcedure
	.input(getMembersInputSchema.optional())
	.query(({ ctx, input = {} }) => getMembersQuery(input, ctx));
