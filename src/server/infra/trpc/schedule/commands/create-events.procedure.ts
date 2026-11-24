import { createEventsSchema } from "@/schemas";
import { createEventsCommand } from "@/server/domain/schedule/commands/create-events/create-events.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createEventsProcedure = adminProcedure
	.input(createEventsSchema)
	.mutation(({ ctx, input }) => createEventsCommand(input, ctx));
