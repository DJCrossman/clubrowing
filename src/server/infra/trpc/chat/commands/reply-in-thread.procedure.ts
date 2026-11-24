import { replyInThreadSchema } from "@/schemas/chat.schema";
import { replyInThreadCommand } from "@/server/domain/chat/commands/reply-in-thread/reply-in-thread.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const replyInThreadProcedure = viewerProcedure
	.input(replyInThreadSchema)
	.mutation(({ ctx, input }) => replyInThreadCommand(input, ctx));
