import { updateActivitySchema } from "@/schemas";
import { updateActivityCommand } from "@/server/domain/activities/commands/update-activity/update-activity.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateActivityAdminProcedure = adminProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) =>
		updateActivityCommand({ ...input, isHidden: undefined }, ctx),
	);
