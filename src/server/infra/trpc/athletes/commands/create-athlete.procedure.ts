import { createAthleteCommand } from "@/domain/athletes/commands/create-athlete/create-athlete.command";
import { createAthleteSchema } from "@/schemas/athlete.schema";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const createAthleteProcedure = adminProcedure
	.input(createAthleteSchema)
	.mutation(({ ctx, input }) => createAthleteCommand(input, ctx));
