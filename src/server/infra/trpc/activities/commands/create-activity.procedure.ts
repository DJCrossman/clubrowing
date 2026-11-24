import { createActivityCommand } from "@/domain/activities/commands/create-activity/create-activity.command";
import { createActivitySchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const createActivityProcedure = protectedProcedure
	.input(createActivitySchema)
	.mutation(({ ctx, input }) =>
		createActivityCommand({ ...input, athleteId: ctx.athlete.id }, ctx),
	);
