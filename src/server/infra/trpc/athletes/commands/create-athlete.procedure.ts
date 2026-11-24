import { createAthleteSchema } from "@/schemas/athlete.schema";
import { createAthleteCommand } from "@/server/domain/athletes/commands/create-athlete/create-athlete.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const createAthleteProcedure = adminProcedure
	.input(createAthleteSchema)
	.mutation(({ ctx, input }) => createAthleteCommand(input, ctx));
