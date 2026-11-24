import { createBoatSchema } from "@/schemas";
import { createBoatCommand } from "@/server/domain/boats/commands/create-boat/create-boat.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createBoatProcedure = adminProcedure
	.input(createBoatSchema)
	.mutation(({ ctx, input }) => createBoatCommand(input, ctx));
