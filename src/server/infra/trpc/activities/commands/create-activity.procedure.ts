import { createActivitySchema } from "@/schemas";
import { createActivityCommand } from "@/server/domain/activities/commands/create-activity/create-activity.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const createActivityProcedure = protectedProcedure
	.input(createActivitySchema)
	.mutation(({ ctx, input }) =>
		createActivityCommand({ ...input, athleteId: ctx.athlete.id }, ctx),
	);
