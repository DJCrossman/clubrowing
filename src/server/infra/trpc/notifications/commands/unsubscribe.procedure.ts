import { unsubscribeCommand } from "@/domain/notifications/commands/unsubscribe/unsubscribe.command";
import { unsubscribeFromPushSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const unsubscribeProcedure = protectedProcedure
	.input(unsubscribeFromPushSchema)
	.mutation(({ ctx, input }) => unsubscribeCommand(input, ctx));
