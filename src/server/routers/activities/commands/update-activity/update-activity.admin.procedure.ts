import { updateActivitySchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { updateActivityCommand } from "./update-activity.command";

export const updateActivityAdminProcedure = adminProcedure
	.input(updateActivitySchema)
	.mutation(({ ctx, input }) =>
		updateActivityCommand({ ...input, isHidden: undefined }, ctx),
	);
