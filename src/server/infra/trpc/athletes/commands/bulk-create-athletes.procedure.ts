import { bulkCreateAthletesCommand } from "@/domain/athletes/commands/bulk-create-athletes/bulk-create-athletes.command";
import { bulkCreateAthletesSchema } from "@/schemas/athlete.schema";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const bulkCreateAthletesProcedure = adminProcedure
	.input(bulkCreateAthletesSchema)
	.mutation(({ ctx, input }) => bulkCreateAthletesCommand(input, ctx));
