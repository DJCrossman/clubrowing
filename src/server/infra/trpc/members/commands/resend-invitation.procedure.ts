import { invitationIdSchema } from "@/schemas";
import { resendInvitationCommand } from "@/server/domain/members/commands/resend-invitation/resend-invitation.command";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";

export const resendInvitationProcedure = adminProcedure
	.input(invitationIdSchema)
	.mutation(({ ctx, input }) => resendInvitationCommand(input, ctx));
