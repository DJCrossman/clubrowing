import { updateEventCommand } from "@/domain/schedule/commands/update-event/update-event.command";
import { updateEventInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateEventProcedure = adminProcedure
	.input(updateEventInputSchema)
	.mutation(({ ctx, input }) => updateEventCommand(input, ctx));
