"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { startTransition, useOptimistic } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { Athletes } from "@/lib/trpc/types";
import { FilterChip } from "@/scenes/schedule/ScheduleScene/components";

interface MemberFilterProps {
	athletes: Athletes;
	athleteIds: string[];
	onChange: (athleteIds: string[]) => void;
}

export function MemberFilter({
	athletes,
	athleteIds,
	onChange,
}: MemberFilterProps) {
	const [selectedIds, setSelectedIds] = useOptimistic(athleteIds);
	const members = athletes
		.map((athlete) => ({
			id: athlete.id,
			name: `${athlete.firstName} ${athlete.lastName}`,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<Popover>
			<PopoverTrigger render={<FilterChip isActive={selectedIds.length > 0} />}>
				<span className="sr-only">Members:</span>
				{selectedIds.length === 0 && "All members"}
				{selectedIds.length === 1 &&
					(members.find((member) => member.id === selectedIds[0])?.name ??
						"1 member")}
				{selectedIds.length > 1 && `${selectedIds.length} members`}
				<IconChevronDown className="size-3.5" />
			</PopoverTrigger>
			<PopoverContent aria-label="Members" align="start" className="w-64 p-0">
				<Command>
					<CommandInput placeholder="Search members" />
					<CommandList>
						<CommandEmpty>No members found.</CommandEmpty>
						<CommandGroup>
							{members.map((member) => (
								<CommandItem
									key={member.id}
									value={member.name}
									onSelect={() =>
										startTransition(() => {
											const nextIds = selectedIds.includes(member.id)
												? selectedIds.filter((id) => id !== member.id)
												: [...selectedIds, member.id];
											setSelectedIds(nextIds);
											onChange(nextIds);
										})
									}
								>
									<Checkbox
										checked={selectedIds.includes(member.id)}
										tabIndex={-1}
										className="pointer-events-none [&_svg]:text-primary-foreground!"
									/>
									{member.name}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
				{selectedIds.length > 0 && (
					<div className="border-t p-1">
						<Button
							variant="ghost"
							size="sm"
							className="w-full"
							onClick={() =>
								startTransition(() => {
									setSelectedIds([]);
									onChange([]);
								})
							}
						>
							Clear
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
