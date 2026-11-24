import { markUnreadSchema } from "@/schemas/chat.schema";
import { markUnreadCommand } from "@/server/domain/chat/commands/mark-unread/mark-unread.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const markUnreadProcedure = viewerProcedure
	.input(markUnreadSchema)
	.mutation(({ ctx, input }) => markUnreadCommand(input, ctx));
