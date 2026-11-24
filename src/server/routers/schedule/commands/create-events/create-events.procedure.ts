import { createEventsSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createEventsCommand } from "./create-events.command";

export const createEventsProcedure = adminProcedure
	.input(createEventsSchema)
	.mutation(({ ctx, input }) => createEventsCommand(input, ctx));
