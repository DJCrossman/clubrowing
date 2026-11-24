import { updateBoatSchema } from "@/schemas";
import { updateBoatCommand } from "@/server/domain/boats/commands/update-boat/update-boat.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateBoatProcedure = adminProcedure
	.input(updateBoatSchema)
	.mutation(({ ctx, input }) => updateBoatCommand(input, ctx));
