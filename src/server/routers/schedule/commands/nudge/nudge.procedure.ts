import { eventIdInputSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { nudgeCommand } from "./nudge.command";

export const nudgeProcedure = adminProcedure
	.input(eventIdInputSchema)
	.mutation(({ ctx, input }) => nudgeCommand(input, ctx));
