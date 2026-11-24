import { deleteGroupInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { deleteGroupCommand } from "./delete-group.command";

export const deleteGroupProcedure = adminProcedure
	.input(deleteGroupInputSchema)
	.mutation(({ ctx, input }) => deleteGroupCommand(input, ctx));
