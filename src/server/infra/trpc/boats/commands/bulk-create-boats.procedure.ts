import { bulkCreateBoatsSchema } from "@/schemas";
import { bulkCreateBoatsCommand } from "@/server/domain/boats/commands/bulk-create-boats/bulk-create-boats.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const bulkCreateBoatsProcedure = adminProcedure
	.input(bulkCreateBoatsSchema)
	.mutation(({ ctx, input }) => bulkCreateBoatsCommand(input, ctx));
