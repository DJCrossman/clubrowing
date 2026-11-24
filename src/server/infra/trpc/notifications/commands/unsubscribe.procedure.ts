import { unsubscribeFromPushSchema } from "@/schemas";
import { unsubscribeCommand } from "@/server/domain/notifications/commands/unsubscribe/unsubscribe.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const unsubscribeProcedure = protectedProcedure
	.input(unsubscribeFromPushSchema)
	.mutation(({ ctx, input }) => unsubscribeCommand(input, ctx));
