import { updateGroupSchema } from "@/schemas";
import { updateGroupCommand } from "@/server/domain/groups/commands/update-group/update-group.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateGroupProcedure = adminProcedure
	.input(updateGroupSchema)
	.mutation(({ ctx, input }) => updateGroupCommand(input, ctx));
