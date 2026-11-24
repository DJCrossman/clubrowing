import { resendInvitationCommand } from "@/domain/members/commands/resend-invitation/resend-invitation.command";
import { invitationIdSchema } from "@/schemas";
import { adminProcedure } from "@/trpc/procedures/admin.procedure";

export const resendInvitationProcedure = adminProcedure
	.input(invitationIdSchema)
	.mutation(({ ctx, input }) => resendInvitationCommand(input, ctx));
