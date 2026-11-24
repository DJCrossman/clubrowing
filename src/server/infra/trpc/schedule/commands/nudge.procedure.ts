import { eventIdInputSchema } from "@/schemas";
import { nudgeCommand } from "@/server/domain/schedule/commands/nudge/nudge.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const nudgeProcedure = adminProcedure
	.input(eventIdInputSchema)
	.mutation(({ ctx, input }) => nudgeCommand(input, ctx));
