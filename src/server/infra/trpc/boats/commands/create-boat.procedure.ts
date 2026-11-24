import { createBoatCommand } from "@/domain/boats/commands/create-boat/create-boat.command";
import { createBoatSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createBoatProcedure = adminProcedure
	.input(createBoatSchema)
	.mutation(({ ctx, input }) => createBoatCommand(input, ctx));
