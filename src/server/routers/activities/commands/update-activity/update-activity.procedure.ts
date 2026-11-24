import { updateActivitySchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { updateActivityMemberCommand } from "./update-activity.member.command";

export const updateActivityProcedure = protectedProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) => updateActivityMemberCommand(input, ctx));
