import { createErgSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createErgCommand } from "./create-erg.command";

export const createErgProcedure = adminProcedure
	.input(createErgSchema)
	.mutation(({ ctx, input }) => createErgCommand(input, ctx));
