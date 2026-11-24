import { inviteMembersSchema } from "@/schemas";
import { inviteMembersCommand } from "@/server/domain/members/commands/invite-members/invite-members.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const inviteMembersProcedure = adminProcedure
	.input(inviteMembersSchema)
	.mutation(({ ctx, input }) => inviteMembersCommand(input, ctx));
