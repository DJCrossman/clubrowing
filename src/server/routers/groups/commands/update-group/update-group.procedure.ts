import { updateGroupSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { updateGroupCommand } from "./update-group.command";

export const updateGroupProcedure = adminProcedure
	.input(updateGroupSchema)
	.mutation(({ ctx, input }) => updateGroupCommand(input, ctx));
