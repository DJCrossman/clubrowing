import { bulkCreateBoatsCommand } from "@/domain/boats/commands/bulk-create-boats/bulk-create-boats.command";
import { bulkCreateBoatsSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const bulkCreateBoatsProcedure = adminProcedure
	.input(bulkCreateBoatsSchema)
	.mutation(({ ctx, input }) => bulkCreateBoatsCommand(input, ctx));
