import { updateErgSchema } from "@/schemas";
import { updateErgCommand } from "@/server/domain/ergs/commands/update-erg/update-erg.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateErgProcedure = adminProcedure
	.input(updateErgSchema)
	.mutation(({ ctx, input }) => updateErgCommand(input, ctx));
