import { updateGroupCommand } from "@/domain/groups/commands/update-group/update-group.command";
import { updateGroupSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateGroupProcedure = adminProcedure
	.input(updateGroupSchema)
	.mutation(({ ctx, input }) => updateGroupCommand(input, ctx));
