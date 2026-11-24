import { createErgCommand } from "@/domain/ergs/commands/create-erg/create-erg.command";
import { createErgSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createErgProcedure = adminProcedure
	.input(createErgSchema)
	.mutation(({ ctx, input }) => createErgCommand(input, ctx));
