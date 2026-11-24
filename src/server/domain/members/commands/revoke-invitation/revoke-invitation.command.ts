import type { AdminContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { InvitationIdInput } from "@/schemas";
import {
	describeClerkError,
	revokeOrganizationInvitation,
} from "@/server/clerk/organization-members";

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
