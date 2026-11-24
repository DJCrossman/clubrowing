import { createActivitySchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { createActivityCommand } from "./create-activity.command";

export const createActivityProcedure = protectedProcedure
	.input(createActivitySchema)
	.mutation(({ ctx, input }) =>
		createActivityCommand({ ...input, athleteId: ctx.athlete.id }, ctx),
	);
