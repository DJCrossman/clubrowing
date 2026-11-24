import { bulkCreateAthletesSchema } from "@/schemas/athlete.schema";
import { bulkCreateAthletesCommand } from "@/server/domain/athletes/commands/bulk-create-athletes/bulk-create-athletes.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const bulkCreateAthletesProcedure = adminProcedure
	.input(bulkCreateAthletesSchema)
	.mutation(({ ctx, input }) => bulkCreateAthletesCommand(input, ctx));
