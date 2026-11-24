import { markReadCommand } from "@/domain/chat/commands/mark-read/mark-read.command";
import { markReadSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const markReadProcedure = viewerProcedure
	.input(markReadSchema)
	.mutation(({ ctx, input }) => markReadCommand(input, ctx));
