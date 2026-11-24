import { deleteActivityInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { deleteActivityCommand } from "./delete-activity.command";

export const deleteActivityAdminProcedure = adminProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityCommand(input, ctx));
