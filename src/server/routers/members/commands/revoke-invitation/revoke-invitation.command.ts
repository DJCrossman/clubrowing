import type { InvitationIdInput } from "@/schemas";
import {
	describeClerkError,
	revokeOrganizationInvitation,
} from "@/server/clerk/organization-members";
import type { AdminContext } from "@/server/context";
import { DomainError } from "@/server/domain/common/domain-error";

export async function revokeInvitationCommand(
	{ invitationId }: InvitationIdInput,
	{ user }: AdminContext,
) {
	try {
		await revokeOrganizationInvitation({
			invitationId,
			requestingUserId: user.id,
		});
	} catch (error) {
		throw new DomainError(
			"BAD_REQUEST",
			describeClerkError(error, "Could not revoke the invitation"),
		);
	}
	return { invitationId };
}
