import { createBoatSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createBoatCommand } from "./create-boat.command";

export const createBoatProcedure = adminProcedure
	.input(createBoatSchema)
	.mutation(({ ctx, input }) => createBoatCommand(input, ctx));
