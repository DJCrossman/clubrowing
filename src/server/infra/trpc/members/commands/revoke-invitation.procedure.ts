import { revokeInvitationCommand } from "@/domain/members/commands/revoke-invitation/revoke-invitation.command";
import { invitationIdSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const revokeInvitationProcedure = adminProcedure
	.input(invitationIdSchema)
	.mutation(({ ctx, input }) => revokeInvitationCommand(input, ctx));
