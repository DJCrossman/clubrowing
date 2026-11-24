import { updateActivityCommand } from "@/domain/activities/commands/update-activity/update-activity.command";
import { updateActivitySchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateActivityAdminProcedure = adminProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) =>
		updateActivityCommand({ ...input, isHidden: undefined }, ctx),
	);
