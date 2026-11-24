import { createAthleteSchema } from "@/schemas/athlete.schema";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { createAthleteCommand } from "./create-athlete.command";

export const createAthleteProcedure = adminProcedure
	.input(createAthleteSchema)
	.mutation(({ ctx, input }) => createAthleteCommand(input, ctx));
