import { deleteEventInputSchema } from "@/schemas";
import { deleteEventCommand } from "@/server/domain/schedule/commands/delete-event/delete-event.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const deleteEventProcedure = adminProcedure
	.input(deleteEventInputSchema)
	.mutation(({ ctx, input }) => deleteEventCommand(input, ctx));
