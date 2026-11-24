import { createActivitySchema } from "@/schemas";
import { createActivityCommand } from "@/server/domain/activities/commands/create-activity/create-activity.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createActivityAdminProcedure = adminProcedure
	.input(createActivitySchema)
	.mutation(({ ctx, input }) => createActivityCommand(input, ctx));
