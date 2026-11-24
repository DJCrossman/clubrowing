import { addDmMembersCommand } from "@/domain/chat/commands/add-dm-members/add-dm-members.command";
import { addDmMembersSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const addDmMembersProcedure = viewerProcedure
	.input(addDmMembersSchema)
	.mutation(({ ctx, input }) => addDmMembersCommand(input, ctx));
