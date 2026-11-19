import { markErgSchema } from "@/schemas";
import { viewerProcedure } from "@/server/procedures";
import { markErgCommand } from "./mark-erg.command";

export const markErgProcedure = viewerProcedure
	.input(markErgSchema)
	.mutation(({ ctx, input }) => markErgCommand(input, ctx));
