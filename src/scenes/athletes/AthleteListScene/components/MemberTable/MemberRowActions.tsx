"use client";

import { IconDots, IconMailPlus, IconMessage } from "@tabler/icons-react";
import Link from "next/link";
import { createContext, use } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useAuth";
import { routes } from "@/lib/routes";
import type { Member } from "@/lib/trpc/types";

export interface MemberActions {
	canMessage: (member: Member) => boolean;
	isMessaging: (member: Member) => boolean;
	onMessage: (member: Member) => void;
	isInviting: (email: string) => boolean;
	onInvite: (email: string) => void;
	onResend: (invitationId: string) => void;
	onRevoke: (invitationId: string) => void;
}

interface MemberRowActionsProps {
	member: Member;
}

/**
 * Feeds the row actions from the scene. A table column's cell is rendered as
 * its own component, so a cell that closed over these callbacks would remount
 * every row's buttons whenever they change.
 */
export const MemberActionsContext = createContext<MemberActions | null>(null);

export function MemberRowActions({ member }: MemberRowActionsProps) {
	const { isAdmin } = useCurrentUser();
	const actions = use(MemberActionsContext);
	if (!actions) {
		throw new Error(
			"MemberRowActions must be used within MemberActionsContext",
		);
	}
	const {
		canMessage,
		isMessaging,
		onMessage,
		isInviting,
		onInvite,
		onResend,
		onRevoke,
	} = actions;
	const { athleteId, invitationId, email } = member;
	const showMessage = canMessage(member);
	const canInvite = isAdmin && member.account === "none" && !!email;
	const hasMenu = !!athleteId || showMessage || canInvite || !!invitationId;

	return (
		<div className="flex items-center justify-end gap-1">
			{showMessage && (
				<Button
					variant="ghost"
					size="icon-sm"
					className="size-7"
					aria-label={`Message ${member.name}`}
					title="Message"
					disabled={isMessaging(member)}
					onClick={() => onMessage(member)}
				>
					<IconMessage />
				</Button>
			)}
			{canInvite && email && (
				<Button
					variant="ghost"
					size="icon-sm"
					className="size-7"
					aria-label={`Invite ${member.name}`}
					title="Invite by email"
					disabled={isInviting(email)}
					onClick={() => onInvite(email)}
				>
					<IconMailPlus />
				</Button>
			)}
			{hasMenu && (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								className="size-7"
								aria-label={`More actions for ${member.name}`}
							/>
						}
					>
						<IconDots />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{athleteId && (
							<DropdownMenuItem
								render={<Link href={routes.members.view(athleteId)} />}
							>
								View details
							</DropdownMenuItem>
						)}
						{showMessage && (
							<DropdownMenuItem onClick={() => onMessage(member)}>
								Send message
							</DropdownMenuItem>
						)}
						{isAdmin && athleteId && (
							<DropdownMenuItem
								render={<Link href={routes.members.edit(athleteId)} />}
							>
								Edit
							</DropdownMenuItem>
						)}
						{canInvite && email && (
							<DropdownMenuItem onClick={() => onInvite(email)}>
								Invite by email
							</DropdownMenuItem>
						)}
						{isAdmin && invitationId && (
							<>
								<DropdownMenuItem onClick={() => onResend(invitationId)}>
									Resend invitation
								</DropdownMenuItem>
								<DropdownMenuItem
									variant="destructive"
									onClick={() => onRevoke(invitationId)}
								>
									Revoke invitation
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
