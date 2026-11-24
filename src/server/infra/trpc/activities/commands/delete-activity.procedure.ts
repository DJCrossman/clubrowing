import { deleteActivityMemberCommand } from "@/domain/activities/commands/delete-activity/delete-activity.member.command";
import { deleteActivityInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const deleteActivityProcedure = protectedProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityMemberCommand(input, ctx));
