import { rsvpInputSchema } from "@/schemas";
import { rsvpCommand } from "@/server/domain/schedule/commands/rsvp/rsvp.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const rsvpProcedure = protectedProcedure
	.input(rsvpInputSchema)
	.mutation(({ ctx, input }) => rsvpCommand(input, ctx));
