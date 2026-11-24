import { markReadSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { markReadCommand } from "./mark-read.command";

export const markReadProcedure = viewerProcedure
	.input(markReadSchema)
	.mutation(({ ctx, input }) => markReadCommand(input, ctx));
