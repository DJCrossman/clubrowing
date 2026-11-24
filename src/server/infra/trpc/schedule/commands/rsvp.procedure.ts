import { rsvpCommand } from "@/domain/schedule/commands/rsvp/rsvp.command";
import { rsvpInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const rsvpProcedure = protectedProcedure
	.input(rsvpInputSchema)
	.mutation(({ ctx, input }) => rsvpCommand(input, ctx));
