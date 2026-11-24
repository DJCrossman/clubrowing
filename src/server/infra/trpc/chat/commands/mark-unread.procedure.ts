import { markUnreadCommand } from "@/domain/chat/commands/mark-unread/mark-unread.command";
import { markUnreadSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const markUnreadProcedure = viewerProcedure
	.input(markUnreadSchema)
	.mutation(({ ctx, input }) => markUnreadCommand(input, ctx));
