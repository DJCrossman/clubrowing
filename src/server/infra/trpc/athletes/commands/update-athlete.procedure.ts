import { updateAthleteSchema } from "@/schemas/athlete.schema";
import { updateAthleteCommand } from "@/server/domain/athletes/commands/update-athlete/update-athlete.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const updateAthleteProcedure = adminProcedure
	.input(updateAthleteSchema)
	.mutation(({ ctx, input }) => updateAthleteCommand(input, ctx));
