import { updateBoatCommand } from "@/domain/boats/commands/update-boat/update-boat.command";
import { updateBoatSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateBoatProcedure = adminProcedure
	.input(updateBoatSchema)
	.mutation(({ ctx, input }) => updateBoatCommand(input, ctx));
