import { createEventSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createEventCommand } from "./create-event.command";

export const createEventProcedure = adminProcedure
	.input(createEventSchema)
	.mutation(({ ctx, input }) => createEventCommand(input, ctx));
