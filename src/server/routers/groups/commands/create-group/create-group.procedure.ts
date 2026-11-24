import { createGroupSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createGroupCommand } from "./create-group.command";

export const createGroupProcedure = adminProcedure
	.input(createGroupSchema)
	.mutation(({ ctx, input }) => createGroupCommand(input, ctx));
