import { deleteErgCommand } from "@/domain/ergs/commands/delete-erg/delete-erg.command";
import { deleteErgInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const deleteErgProcedure = adminProcedure
	.input(deleteErgInputSchema)
	.mutation(({ ctx, input }) => deleteErgCommand(input, ctx));
