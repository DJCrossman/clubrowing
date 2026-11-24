import { updateActivitySchema } from "@/schemas";
import { updateActivityMemberCommand } from "@/server/domain/activities/commands/update-activity/update-activity.member.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const updateActivityProcedure = protectedProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) => updateActivityMemberCommand(input, ctx));
