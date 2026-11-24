import { rsvpInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { rsvpCommand } from "./rsvp.command";

export const rsvpProcedure = protectedProcedure
	.input(rsvpInputSchema)
	.mutation(({ ctx, input }) => rsvpCommand(input, ctx));
