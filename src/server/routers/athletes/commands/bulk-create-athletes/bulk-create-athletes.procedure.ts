import { bulkCreateAthletesSchema } from "@/schemas/athlete.schema";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { bulkCreateAthletesCommand } from "./bulk-create-athletes.command";

export const bulkCreateAthletesProcedure = adminProcedure
	.input(bulkCreateAthletesSchema)
	.mutation(({ ctx, input }) => bulkCreateAthletesCommand(input, ctx));
