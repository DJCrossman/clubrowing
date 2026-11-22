"use client";

import {
	IconCaretDown,
	IconCaretUp,
	IconChevronDown,
	IconCircleCheck,
	IconMailPlus,
	IconPlus,
	IconSearch,
} from "@tabler/icons-react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { DateTime } from "luxon";
import Link from "next/link";
import { useMemo } from "react";
import { InitialsAvatar } from "@/components/chat/initials-avatar";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCurrentUser } from "@/hooks/useAuth";
import type { TableState } from "@/hooks/useTable";
import { routes } from "@/lib/routes";
import type { Member, MembersResult, Programs } from "@/lib/trpc/types";
import { FilterChip } from "@/scenes/schedule/ScheduleScene/components";
import { MemberRowActions } from "./MemberRowActions";

const activeMembershipOptions = ["all", "true", "false"] as const;

const columns: ColumnDef<Member>[] = [
	{
		accessorKey: "name",
		header: () => <div className="lg:w-72">Name</div>,
		cell: ({ row }) => {
			const member = row.original;
			const accountLabel = getAccountLabel(member);
			return (
				<div className="flex flex-wrap items-center gap-1.5">
					{member.athleteId ? (
						<Link href={routes.members.view(member.athleteId)}>
							{member.name}
						</Link>
					) : (
						<span>{member.name}</span>
					)}
					{member.isAdmin && (
						<Badge variant="secondary" className="px-1.5">
							Admin
						</Badge>
					)}
					{accountLabel && (
						<Badge variant="outline" className="text-muted-foreground px-1.5">
							{accountLabel}
						</Badge>
					)}
				</div>
			);
		},
		enableHiding: false,
		enableSorting: true,
	},
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ row }) => (
			<span className="text-muted-foreground">{row.original.email}</span>
		),
		enableSorting: false,
	},
	{
		id: "active",
		header: "Active",
		cell: ({ row }) =>
			row.original.athlete?.activeMembership ? (
				<IconCircleCheck size={16} className="text-green-500" />
			) : null,
		enableSorting: false,
	},
	{
		id: "program",
		header: "Program",
		cell: ({ row }) => {
			const membership = row.original.athlete?.activeMembership;
			if (!membership) return null;
			return (
				<Badge variant="outline" className="text-muted-foreground px-1.5">
					{membership.name}
				</Badge>
			);
		},
		enableSorting: false,
	},
	{
		id: "groups",
		header: "Groups",
		cell: ({ row }) => {
			const groups = row.original.athlete?.groups ?? [];
			if (groups.length === 0) return null;
			return (
				<div className="flex flex-wrap gap-1">
					{groups.map((group) => (
						<Badge
							key={group.id}
							variant="outline"
							className="text-muted-foreground px-1.5"
							render={<Link href={routes.groups.view(group.id)} />}
						>
							{group.name}
						</Badge>
					))}
				</div>
			);
		},
		enableSorting: false,
	},
	{
		id: "dateJoined",
		header: "Date Joined",
		cell: ({ row }) => {
			const dateJoined = row.original.athlete?.dateJoined;
			return (
				dateJoined &&
				DateTime.fromISO(dateJoined).toLocaleString({
					month: "short",
					year: "numeric",
				})
			);
		},
		enableSorting: true,
	},
	{
		id: "actions",
		header: () => <span className="sr-only">Actions</span>,
		cell: ({ row }) => <MemberRowActions member={row.original} />,
		enableSorting: false,
	},
];

interface IMemberTableProps
	extends TableState<{ programIds: string[]; isActive: boolean }> {
	data: MembersResult;
	programs: Programs | undefined;
	isSyncing: boolean;
	onSync: () => void;
	onInvite: () => void;
}

export function MemberTable({
	data,
	programs,
	isSyncing,
	onSync,
	onInvite,
	pagination,
	sorting,
	filters,
	searchInput,
	onPaginationChange,
	onSortingChange,
	onFiltersChange,
	onSearchChange,
}: IMemberTableProps) {
	const { isAdmin } = useCurrentUser();

	const programOptions: Option[] = useMemo(
		() =>
			(programs ?? []).map((p) => ({
				value: p.id,
				label: p.name,
			})),
		[programs],
	);
	const selectedProgramOptions = useMemo(
		() => programOptions.filter((o) => filters.programIds?.includes(o.value)),
		[programOptions, filters.programIds],
	);

	const table = useReactTable({
		data: data.data,
		columns,
		state: { pagination, sorting },
		getRowId: (row) => row.id,
		manualPagination: true,
		manualSorting: true,
		pageCount: data.totalPages,
		rowCount: data.totalCount,
		onPaginationChange,
		onSortingChange,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="w-full flex-col justify-start gap-6">
			<div className="flex flex-col gap-3 px-4 pb-3 md:hidden">
				<div className="relative">
					<IconSearch className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						aria-label="Search members"
						placeholder="Search members"
						className="h-11 rounded-xl pl-10 text-base"
						value={searchInput}
						onChange={(event) => onSearchChange(event.target.value)}
					/>
				</div>
				<div className="flex gap-2 overflow-x-auto">
					{activeMembershipOptions.map((membership) => (
						<FilterChip
							key={membership}
							isActive={
								(filters.isActive === undefined
									? "all"
									: String(filters.isActive)) === membership
							}
							onClick={() =>
								onFiltersChange({
									isActive:
										membership === "all" ? undefined : membership === "true",
								})
							}
						>
							{membership === "all"
								? "All"
								: membership === "true"
									? "Active"
									: "Inactive"}
						</FilterChip>
					))}
				</div>
				<p className="text-sm text-muted-foreground">
					{data.totalCount} {data.totalCount === 1 ? "member" : "members"}
				</p>
			</div>
			<div className="flex items-center justify-between p-4 max-md:hidden lg:px-6">
				<div className="flex items-center gap-2">
					<div className="relative">
						<IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="search"
							aria-label="Search members"
							placeholder="Search members"
							className="h-8 w-56 pl-8"
							value={searchInput}
							onChange={(event) => onSearchChange(event.target.value)}
						/>
					</div>
					<Label htmlFor="program-selector" className="sr-only">
						Programs
					</Label>
					<MultiSelect
						className="min-w-[240px]"
						placeholder="All Programs"
						options={programOptions}
						value={selectedProgramOptions}
						onChange={(opts) =>
							onFiltersChange({ programIds: opts.map((o) => o.value) })
						}
					/>
					<Label htmlFor="active-membership-selector" className="sr-only">
						Active Membership
					</Label>
					<Select
						items={activeMembershipOptions.map((membership) => ({
							value: membership,
							label:
								membership === "all"
									? "Active & Inactive"
									: membership === "true"
										? "Active"
										: "Inactive",
						}))}
						value={
							filters.isActive === undefined
								? "all"
								: filters.isActive
									? "true"
									: "false"
						}
						onValueChange={(value) =>
							onFiltersChange({
								isActive: value === "all" ? undefined : value === "true",
							})
						}
					>
						<SelectTrigger
							className="flex w-fit"
							size="sm"
							id="active-membership-selector"
						>
							<SelectValue placeholder="Select a program" />
						</SelectTrigger>
						<SelectContent>
							{activeMembershipOptions.map((membership) => (
								<SelectItem key={membership} value={membership}>
									{membership === "all"
										? "Active & Inactive"
										: membership === "true"
											? "Active"
											: "Inactive"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					{isAdmin && (
						<Button size="sm" onClick={onInvite}>
							<IconMailPlus />
							<span className="hidden lg:inline">Invite member</span>
						</Button>
					)}
					<div className="flex items-center">
						<Button
							variant="outline"
							size="sm"
							className="rounded-r-none"
							render={<Link href={routes.members.create()} />}
						>
							<IconPlus />
							<span className="hidden lg:inline">Add Member</span>
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="outline"
										size="sm"
										className="rounded-l-none border-l-0 px-2"
										aria-label="More add options"
									/>
								}
							>
								<IconChevronDown />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									render={<Link href={routes.members.bulkCreate()} />}
								>
									Bulk Add Members
								</DropdownMenuItem>
								{isAdmin && (
									<DropdownMenuItem disabled={isSyncing} onClick={onSync}>
										Sync from RCA
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
			<div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
				<ul className="divide-y overflow-hidden rounded-xl border bg-card text-card-foreground md:hidden">
					{data.data.length === 0 && (
						<li className="p-4 text-center text-sm text-muted-foreground">
							No results.
						</li>
					)}
					{data.data.map((member) => (
						<li key={member.id} className="flex items-start gap-3 px-3.5 py-3">
							{member.account === "invited" && !member.athlete ? (
								<span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed text-sm text-muted-foreground">
									@
								</span>
							) : (
								<InitialsAvatar
									initials={getInitials(member.name)}
									name={member.name}
									className="size-10 rounded-full"
								/>
							)}
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="flex flex-wrap items-center gap-1.5">
									{member.athleteId ? (
										<Link
											href={routes.members.view(member.athleteId)}
											className="truncate text-[17px] font-semibold"
										>
											{member.name}
										</Link>
									) : (
										<span className="truncate text-[17px] font-semibold">
											{member.name}
										</span>
									)}
									{member.isAdmin && (
										<Badge
											variant="secondary"
											className="px-1.5 text-[10px] font-semibold tracking-wide uppercase"
										>
											Admin
										</Badge>
									)}
									{getAccountLabel(member) && (
										<Badge
											variant="outline"
											className="text-muted-foreground px-1.5 text-[10px] font-semibold tracking-wide uppercase"
										>
											{getAccountLabel(member)}
										</Badge>
									)}
								</span>
								<span className="truncate text-sm text-muted-foreground">
									{member.account === "invited" && member.invitedAt
										? `Invited ${DateTime.fromISO(member.invitedAt).toLocaleString({ month: "short", day: "numeric" })} · as ${member.isAdmin ? "Admin" : "Member"}`
										: (member.email ?? "No email on file")}
								</span>
								{(member.athlete?.groups.length ?? 0) > 0 && (
									<span className="flex flex-wrap gap-1">
										{member.athlete?.groups.map((group) => (
											<Badge
												key={group.id}
												variant="secondary"
												className="px-1.5"
												render={<Link href={routes.groups.view(group.id)} />}
											>
												{group.name}
											</Badge>
										))}
									</span>
								)}
							</span>
							<MemberRowActions member={member} />
						</li>
					))}
				</ul>
				<div className="overflow-hidden rounded-lg border max-md:hidden">
					<Table>
						<TableHeader className="bg-muted sticky top-0 z-10">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead
												key={header.id}
												colSpan={header.colSpan}
												onClick={header.column.getToggleSortingHandler()}
											>
												<div className="flex items-center gap-2">
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
													{{
														asc: <IconCaretUp />,
														desc: <IconCaretDown />,
													}[header.column.getIsSorted() as string] ?? null}
												</div>
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody className="**:data-[slot=table-cell]:first:w-8">
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
				<div className="flex items-center justify-between px-4">
					<div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
						{data.totalCount} {data.totalCount === 1 ? "member" : "members"}.
					</div>
					<DataTablePagination table={table} />
				</div>
			</div>
		</div>
	);
}

function getAccountLabel(member: Member): string | null {
	if (member.account === "invited") return "Invited";
	if (member.account === "none") return "No account";
	if (!member.athlete) return "No profile yet";
	return null;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((part) => part.charAt(0).toUpperCase())
		.slice(0, 2)
		.join("");
}
