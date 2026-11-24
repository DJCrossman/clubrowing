import { deleteEventInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { deleteEventCommand } from "./delete-event.command";

export const deleteEventProcedure = adminProcedure
	.input(deleteEventInputSchema)
	.mutation(({ ctx, input }) => deleteEventCommand(input, ctx));
