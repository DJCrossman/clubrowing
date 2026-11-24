import { deleteEventCommand } from "@/domain/schedule/commands/delete-event/delete-event.command";
import { deleteEventInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const deleteEventProcedure = adminProcedure
	.input(deleteEventInputSchema)
	.mutation(({ ctx, input }) => deleteEventCommand(input, ctx));
