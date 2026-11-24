import { deleteGroupCommand } from "@/domain/groups/commands/delete-group/delete-group.command";
import { deleteGroupInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const deleteGroupProcedure = adminProcedure
	.input(deleteGroupInputSchema)
	.mutation(({ ctx, input }) => deleteGroupCommand(input, ctx));
