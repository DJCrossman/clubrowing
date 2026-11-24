import { subscribeToPushSchema } from "@/schemas";
import { subscribeCommand } from "@/server/domain/notifications/commands/subscribe/subscribe.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const subscribeProcedure = protectedProcedure
	.input(subscribeToPushSchema)
	.mutation(({ ctx, input }) => subscribeCommand(input, ctx));
