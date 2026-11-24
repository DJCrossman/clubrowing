import { subscribeCommand } from "@/domain/notifications/commands/subscribe/subscribe.command";
import { subscribeToPushSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const subscribeProcedure = protectedProcedure
	.input(subscribeToPushSchema)
	.mutation(({ ctx, input }) => subscribeCommand(input, ctx));
