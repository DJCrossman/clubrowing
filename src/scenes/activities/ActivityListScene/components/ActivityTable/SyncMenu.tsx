"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useAuth";
import type { SyncSource } from "@/hooks/useSyncStatus";

interface SyncMenuProps {
	isSyncing: (source: SyncSource) => boolean;
	isCoolingDown: (source: SyncSource) => boolean;
	onSync: (source: SyncSource) => void;
	trigger?: ReactElement;
}

export function SyncMenu({
	isSyncing,
	isCoolingDown,
	onSync,
	trigger,
}: SyncMenuProps) {
	const { user } = useCurrentUser();

	if (!user.stravaConnected && !user.concept2Connected) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					trigger ?? (
						<Button
							variant="outline"
							size="sm"
							className="rounded-l-none border-l-0 px-2"
							aria-label="Sync activities"
						>
							<IconChevronDown />
						</Button>
					)
				}
			/>
			<DropdownMenuContent align="end">
				{user.stravaConnected && (
					<SyncMenuItem
						label="Sync Strava"
						source="strava"
						syncing={isSyncing("strava")}
						coolingDown={isCoolingDown("strava")}
						disabled={isSyncing("strava") || isCoolingDown("strava")}
						onClick={() => onSync("strava")}
					/>
				)}
				{user.concept2Connected && (
					<SyncMenuItem
						label="Sync Concept2"
						source="concept2"
						syncing={isSyncing("concept2")}
						coolingDown={isCoolingDown("concept2")}
						disabled={isSyncing("concept2") || isCoolingDown("concept2")}
						onClick={() => onSync("concept2")}
					/>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function SyncMenuItem({
	label,
	syncing,
	coolingDown,
	disabled,
	onClick,
}: {
	label: string;
	source: SyncSource;
	syncing: boolean;
	coolingDown: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<DropdownMenuItem disabled={disabled} onClick={onClick}>
			{syncing ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					{label} (syncing…)
				</>
			) : coolingDown ? (
				<>{label} (cooling down)</>
			) : (
				label
			)}
		</DropdownMenuItem>
	);
}
