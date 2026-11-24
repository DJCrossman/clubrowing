import { createEventsCommand } from "@/domain/schedule/commands/create-events/create-events.command";
import { createEventsSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createEventsProcedure = adminProcedure
	.input(createEventsSchema)
	.mutation(({ ctx, input }) => createEventsCommand(input, ctx));
