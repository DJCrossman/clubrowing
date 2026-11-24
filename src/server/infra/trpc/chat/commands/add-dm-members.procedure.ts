import { addDmMembersSchema } from "@/schemas/chat.schema";
import { addDmMembersCommand } from "@/server/domain/chat/commands/add-dm-members/add-dm-members.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const addDmMembersProcedure = viewerProcedure
	.input(addDmMembersSchema)
	.mutation(({ ctx, input }) => addDmMembersCommand(input, ctx));
