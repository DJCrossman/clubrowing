import { invitationIdSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { revokeInvitationCommand } from "./revoke-invitation.command";

export const revokeInvitationProcedure = adminProcedure
	.input(invitationIdSchema)
	.mutation(({ ctx, input }) => revokeInvitationCommand(input, ctx));
