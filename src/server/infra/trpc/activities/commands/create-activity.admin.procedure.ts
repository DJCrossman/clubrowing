import { createActivityCommand } from "@/domain/activities/commands/create-activity/create-activity.command";
import { createActivitySchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createActivityAdminProcedure = adminProcedure
	.input(createActivitySchema)
	.mutation(({ ctx, input }) => createActivityCommand(input, ctx));
