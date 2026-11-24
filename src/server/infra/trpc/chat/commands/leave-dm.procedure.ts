import { leaveDmSchema } from "@/schemas/chat.schema";
import { leaveDmCommand } from "@/server/domain/chat/commands/leave-dm/leave-dm.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const leaveDmProcedure = viewerProcedure
	.input(leaveDmSchema)
	.mutation(({ ctx, input }) => leaveDmCommand(input, ctx));
