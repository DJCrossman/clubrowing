import { markErgSchema } from "@/schemas";
import { markErgCommand } from "@/server/domain/ergs/commands/mark-erg/mark-erg.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const markErgProcedure = viewerProcedure
	.input(markErgSchema)
	.mutation(({ ctx, input }) => markErgCommand(input, ctx));
