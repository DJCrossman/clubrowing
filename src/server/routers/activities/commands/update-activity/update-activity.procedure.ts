import { updateActivitySchema } from "@/schemas";
import { authenticatedProcedure } from "@/server/common/procedures/authenticated.procedure";
import { updateActivityMemberCommand } from "./update-activity.member.command";

export const updateActivityProcedure = authenticatedProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) => updateActivityMemberCommand(input, ctx));
