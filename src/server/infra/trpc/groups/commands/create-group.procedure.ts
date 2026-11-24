import { createGroupCommand } from "@/domain/groups/commands/create-group/create-group.command";
import { createGroupSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createGroupProcedure = adminProcedure
	.input(createGroupSchema)
	.mutation(({ ctx, input }) => createGroupCommand(input, ctx));
