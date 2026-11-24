import { leaveDmCommand } from "@/domain/chat/commands/leave-dm/leave-dm.command";
import { leaveDmSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const leaveDmProcedure = viewerProcedure
	.input(leaveDmSchema)
	.mutation(({ ctx, input }) => leaveDmCommand(input, ctx));
