import { replyInThreadCommand } from "@/domain/chat/commands/reply-in-thread/reply-in-thread.command";
import { replyInThreadSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const replyInThreadProcedure = viewerProcedure
	.input(replyInThreadSchema)
	.mutation(({ ctx, input }) => replyInThreadCommand(input, ctx));
