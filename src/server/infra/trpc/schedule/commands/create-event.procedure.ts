import { createEventSchema } from "@/schemas";
import { createEventCommand } from "@/server/domain/schedule/commands/create-event/create-event.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createEventProcedure = adminProcedure
	.input(createEventSchema)
	.mutation(({ ctx, input }) => createEventCommand(input, ctx));
