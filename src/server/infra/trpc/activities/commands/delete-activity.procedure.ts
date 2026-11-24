import { deleteActivityInputSchema } from "@/schemas";
import { deleteActivityMemberCommand } from "@/server/domain/activities/commands/delete-activity/delete-activity.member.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const deleteActivityProcedure = protectedProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityMemberCommand(input, ctx));
