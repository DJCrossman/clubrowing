import { updateErgCommand } from "@/domain/ergs/commands/update-erg/update-erg.command";
import { updateErgSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateErgProcedure = adminProcedure
	.input(updateErgSchema)
	.mutation(({ ctx, input }) => updateErgCommand(input, ctx));
