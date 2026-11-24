import { markErgCommand } from "@/domain/ergs/commands/mark-erg/mark-erg.command";
import { markErgSchema } from "@/schemas";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const markErgProcedure = viewerProcedure
	.input(markErgSchema)
	.mutation(({ ctx, input }) => markErgCommand(input, ctx));
