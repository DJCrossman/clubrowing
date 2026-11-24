import { forwardMessageSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { forwardMessageCommand } from "./forward-message.command";

export const forwardMessageProcedure = viewerProcedure
	.input(forwardMessageSchema)
	.mutation(({ ctx, input }) => forwardMessageCommand(input, ctx));
