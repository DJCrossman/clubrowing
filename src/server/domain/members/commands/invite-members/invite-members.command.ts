import type { AdminContext } from "@/domain/common/context";
import type { InviteMembers } from "@/schemas";
import type { PendingInvitation } from "@/server/services/user-service";

type SkippedInvite = { email: string; reason: string };
type InviteOutcome = { sent: PendingInvitation } | { skipped: SkippedInvite };

export async function inviteMembersCommand(
	{ emails, role }: InviteMembers,
	{ user, origin, services }: AdminContext,
) {
	const [members, invitations] = await Promise.all([
		services.userService.listMembers(),
		services.userService.listPendingInvitations(),
	]);
	const memberEmails = new Set(
		members.flatMap((member) =>
			member.email ? [member.email.toLowerCase()] : [],
		),
	);
	const pendingEmails = new Set(
		invitations.map((invitation) => invitation.email.toLowerCase()),
	);

	const outcomes = await Promise.all(
		emails.map(async (email): Promise<InviteOutcome> => {
			if (memberEmails.has(email)) {
				return { skipped: { email, reason: "already a member" } };
			}
			if (pendingEmails.has(email)) {
				return { skipped: { email, reason: "already invited" } };
			}
			try {
				return {
					sent: await services.userService.inviteMember({
						email,
						role,
						inviterUserId: user.id,
						redirectUrl: `${origin}/signup`,
					}),
				};
			} catch (error) {
				return {
					skipped: {
						email,
						reason: error instanceof Error ? error.message : String(error),
					},
				};
			}
		}),
	);

	return {
		sent: outcomes.flatMap((outcome) =>
			"sent" in outcome ? [outcome.sent] : [],
		),
		skipped: outcomes.flatMap((outcome) =>
			"skipped" in outcome ? [outcome.skipped] : [],
		),
	};
}
