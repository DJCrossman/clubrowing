import { markErgSchema } from "@/schemas";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { markErgCommand } from "./mark-erg.command";

export const markErgProcedure = viewerProcedure
	.input(markErgSchema)
	.mutation(({ ctx, input }) => markErgCommand(input, ctx));
