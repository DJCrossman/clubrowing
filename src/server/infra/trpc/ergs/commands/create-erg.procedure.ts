import { createErgSchema } from "@/schemas";
import { createErgCommand } from "@/server/domain/ergs/commands/create-erg/create-erg.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createErgProcedure = adminProcedure
	.input(createErgSchema)
	.mutation(({ ctx, input }) => createErgCommand(input, ctx));
