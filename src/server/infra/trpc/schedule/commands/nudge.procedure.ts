import { nudgeCommand } from "@/domain/schedule/commands/nudge/nudge.command";
import { eventIdInputSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const nudgeProcedure = adminProcedure
	.input(eventIdInputSchema)
	.mutation(({ ctx, input }) => nudgeCommand(input, ctx));
