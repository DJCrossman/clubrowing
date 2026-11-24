import { createEventCommand } from "@/domain/schedule/commands/create-event/create-event.command";
import { createEventSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createEventProcedure = adminProcedure
	.input(createEventSchema)
	.mutation(({ ctx, input }) => createEventCommand(input, ctx));
