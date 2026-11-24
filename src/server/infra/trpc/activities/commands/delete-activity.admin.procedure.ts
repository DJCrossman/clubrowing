import { deleteActivityCommand } from "@/domain/activities/commands/delete-activity/delete-activity.command";
import { deleteActivityInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const deleteActivityAdminProcedure = adminProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityCommand(input, ctx));
