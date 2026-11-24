import { deleteErgInputSchema } from "@/schemas";
import { deleteErgCommand } from "@/server/domain/ergs/commands/delete-erg/delete-erg.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const deleteErgProcedure = adminProcedure
	.input(deleteErgInputSchema)
	.mutation(({ ctx, input }) => deleteErgCommand(input, ctx));
