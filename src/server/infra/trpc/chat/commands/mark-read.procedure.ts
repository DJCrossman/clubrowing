import { markReadSchema } from "@/schemas/chat.schema";
import { markReadCommand } from "@/server/domain/chat/commands/mark-read/mark-read.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const markReadProcedure = viewerProcedure
	.input(markReadSchema)
	.mutation(({ ctx, input }) => markReadCommand(input, ctx));
