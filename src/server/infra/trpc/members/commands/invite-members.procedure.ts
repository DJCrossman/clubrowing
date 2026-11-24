import { inviteMembersCommand } from "@/domain/members/commands/invite-members/invite-members.command";
import { inviteMembersSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const inviteMembersProcedure = adminProcedure
	.input(inviteMembersSchema)
	.mutation(({ ctx, input }) => inviteMembersCommand(input, ctx));
