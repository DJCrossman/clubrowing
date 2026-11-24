import { invitationIdSchema } from "@/schemas";
import { revokeInvitationCommand } from "@/server/domain/members/commands/revoke-invitation/revoke-invitation.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const revokeInvitationProcedure = adminProcedure
	.input(invitationIdSchema)
	.mutation(({ ctx, input }) => revokeInvitationCommand(input, ctx));
