import { createGroupSchema } from "@/schemas";
import { createGroupCommand } from "@/server/domain/groups/commands/create-group/create-group.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createGroupProcedure = adminProcedure
	.input(createGroupSchema)
	.mutation(({ ctx, input }) => createGroupCommand(input, ctx));
