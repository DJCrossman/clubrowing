import { updateActivityMemberCommand } from "@/domain/activities/commands/update-activity/update-activity.member.command";
import { updateActivitySchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const updateActivityProcedure = protectedProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) => updateActivityMemberCommand(input, ctx));
