import { updateEventInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { updateEventCommand } from "./update-event.command";

export const updateEventProcedure = adminProcedure
	.input(updateEventInputSchema)
	.mutation(({ ctx, input }) => updateEventCommand(input, ctx));
