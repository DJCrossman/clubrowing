import { updateAthleteCommand } from "@/domain/athletes/commands/update-athlete/update-athlete.command";
import { updateAthleteSchema } from "@/schemas/athlete.schema";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const updateAthleteProcedure = adminProcedure
	.input(updateAthleteSchema)
	.mutation(({ ctx, input }) => updateAthleteCommand(input, ctx));
