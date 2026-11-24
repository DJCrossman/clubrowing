import { invitationIdSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { resendInvitationCommand } from "./resend-invitation.command";

export const resendInvitationProcedure = adminProcedure
	.input(invitationIdSchema)
	.mutation(({ ctx, input }) => resendInvitationCommand(input, ctx));
