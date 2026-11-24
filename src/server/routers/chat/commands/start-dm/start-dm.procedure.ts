import { startDmSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { startDmCommand } from "./start-dm.command";

export const startDmProcedure = viewerProcedure
	.input(startDmSchema)
	.mutation(({ ctx, input }) => startDmCommand(input, ctx));
