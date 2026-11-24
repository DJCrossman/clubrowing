import { updateEventInputSchema } from "@/schemas";
import { updateEventCommand } from "@/server/domain/schedule/commands/update-event/update-event.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateEventProcedure = adminProcedure
	.input(updateEventInputSchema)
	.mutation(({ ctx, input }) => updateEventCommand(input, ctx));
