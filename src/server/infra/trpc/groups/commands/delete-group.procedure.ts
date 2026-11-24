import { deleteGroupInputSchema } from "@/schemas";
import { deleteGroupCommand } from "@/server/domain/groups/commands/delete-group/delete-group.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const deleteGroupProcedure = adminProcedure
	.input(deleteGroupInputSchema)
	.mutation(({ ctx, input }) => deleteGroupCommand(input, ctx));
