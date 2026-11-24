import { replyInThreadSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { replyInThreadCommand } from "./reply-in-thread.command";

export const replyInThreadProcedure = viewerProcedure
	.input(replyInThreadSchema)
	.mutation(({ ctx, input }) => replyInThreadCommand(input, ctx));
