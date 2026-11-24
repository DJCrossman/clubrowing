import { deleteActivityInputSchema } from "@/schemas";
import { deleteActivityCommand } from "@/server/domain/activities/commands/delete-activity/delete-activity.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const deleteActivityAdminProcedure = adminProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityCommand(input, ctx));
