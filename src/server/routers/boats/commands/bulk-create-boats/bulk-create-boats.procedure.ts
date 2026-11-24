import { bulkCreateBoatsSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { bulkCreateBoatsCommand } from "./bulk-create-boats.command";

export const bulkCreateBoatsProcedure = adminProcedure
	.input(bulkCreateBoatsSchema)
	.mutation(({ ctx, input }) => bulkCreateBoatsCommand(input, ctx));
