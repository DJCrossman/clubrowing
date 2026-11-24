import type { AdminContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { InvitationIdInput } from "@/schemas";

export async function revokeInvitationCommand(
	{ invitationId }: InvitationIdInput,
	{ user, services }: AdminContext,
) {
	try {
		await services.userService.revokeInvitation({
			invitationId,
			requestingUserId: user.id,
		});
	} catch (error) {
		throw new DomainError(
			"BAD_REQUEST",
			error instanceof Error ? error.message : String(error),
		);
	}
	return { invitationId };
}
