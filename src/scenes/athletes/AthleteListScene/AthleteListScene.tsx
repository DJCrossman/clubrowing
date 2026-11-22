"use client";

import { IconMail, IconUserPlus } from "@tabler/icons-react";
import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { BulkUploadDrawer } from "@/components/bulk-upload-drawer";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/useAuth";
import { useTable } from "@/hooks/useTable";
import { routes } from "@/lib/routes";
import { toastError } from "@/lib/toast";
import { trpcClient } from "@/lib/trpc/client";
import type { Activities, Athlete, MembersResult } from "@/lib/trpc/types";
import { type CreateAthlete, createAthleteSchema } from "@/schemas";
import type { AthleteStats } from "@/schemas/athlete.schema";
import {
	AthleteCreateDrawer,
	AthleteDetailsDrawer,
	MemberTable,
} from "./components";
import { InviteMemberDialog } from "./components/InviteMemberDialog/InviteMemberDialog";
import { useAthleteBulkColumns } from "./components/useAthleteBulkColumns";
import { useMemberInvites } from "./components/useMemberInvites";

const sortColumns = ["name", "dateJoined"] as const;

interface IProps {
	initialData: MembersResult;
	selectedAthlete: Athlete | null;
	activities?: Activities;
	athleteStats: AthleteStats | null;
	isCreateDrawerOpen: boolean;
	isBulkCreateDrawerOpen: boolean;
	isEditingAthlete: boolean;
}

export const AthleteListScene = ({
	initialData,
	selectedAthlete,
	activities = [],
	athleteStats,
	isCreateDrawerOpen,
	isBulkCreateDrawerOpen,
	isEditingAthlete,
}: IProps) => {
	const router = useRouter();
	const { isAdmin } = useCurrentUser();
	const utils = trpcClient.useUtils();
	const athleteBulkColumns = useAthleteBulkColumns();
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const { invite } = useMemberInvites();
	const table = useTable<{ programIds: string[]; isActive: boolean }>();
	const { data: members } = trpcClient.members.getMembers.useQuery(
		{
			page: table.page,
			pageSize: table.pageSize,
			sortBy: sortColumns.find((column) => column === table.sortBy),
			order: table.order,
			programIds: table.filters.programIds?.length
				? table.filters.programIds
				: undefined,
			isActive: table.filters.isActive,
			search: table.search,
		},
		{ initialData, placeholderData: keepPreviousData },
	);
	const { data: programs } = trpcClient.programs.getPrograms.useQuery();
	const syncRca = trpcClient.activities.syncRca.useMutation({
		onSuccess: async (result) => {
			toast.success("Synced from RCA", {
				description: `${result.programs.upserted} programs · ${result.memberships.upserted} memberships`,
			});
			await utils.members.getMembers.invalidate();
		},
		onError: toastError,
	});
	const createAthlete = trpcClient.athletes.createAthlete.useMutation({
		onSuccess: async () => {
			await utils.members.getMembers.invalidate();
			router.push(routes.members.list());
			router.refresh();
		},
	});
	const bulkCreateAthletes = trpcClient.athletes.createAthletes.useMutation({
		onSuccess: async () => {
			await utils.members.getMembers.invalidate();
			router.push(routes.members.list());
			router.refresh();
		},
	});
	const updateAthlete = trpcClient.athletes.updateAthlete.useMutation({
		onSuccess: async () => {
			await utils.members.getMembers.invalidate();
			await utils.athletes.getAthleteById.invalidate();
			router.refresh();
		},
	});

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader breadcrumbs={[{ label: "Members" }]} />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<MobilePageHeader
							title={
								<span className="flex items-center gap-2.5">
									Members
									{isAdmin && (
										<Badge
											variant="outline"
											className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wide uppercase"
										>
											Admin only
										</Badge>
									)}
								</span>
							}
							backHref={routes.more.home()}
							backLabel="More"
							actions={
								<>
									{isAdmin && (
										<Button
											variant="outline"
											size="icon-lg"
											className="rounded-xl"
											aria-label="Invite members"
											onClick={() => setIsInviteOpen(true)}
										>
											<IconMail />
										</Button>
									)}
									<Button
										size="icon-lg"
										className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
										aria-label="Add member"
										render={<Link href={routes.members.create()} />}
									>
										<IconUserPlus />
									</Button>
								</>
							}
						/>
						<div className="flex items-center justify-between p-4 max-md:hidden lg:px-6">
							<Heading as="h1">Members</Heading>
						</div>
						<div className="flex flex-col gap-4 md:gap-6">
							<MemberTable
								data={members}
								programs={programs?.data}
								isSyncing={syncRca.isPending}
								onSync={() => syncRca.mutate()}
								onInvite={() => setIsInviteOpen(true)}
								{...table}
							/>
						</div>
					</div>
				</div>
			</SidebarInset>
			<InviteMemberDialog
				isOpen={isInviteOpen}
				onClose={() => setIsInviteOpen(false)}
				onSubmit={async (data) => {
					const { sent } = await invite.mutateAsync(data);
					if (sent.length > 0) setIsInviteOpen(false);
				}}
			/>
			<AthleteCreateDrawer
				isOpen={isCreateDrawerOpen}
				onSubmit={async (data) => {
					await createAthlete.mutateAsync(data);
				}}
				onClose={() => router.push(routes.members.list())}
			/>
			<BulkUploadDrawer<CreateAthlete>
				isOpen={isBulkCreateDrawerOpen}
				onClose={() => router.push(routes.members.list())}
				schema={createAthleteSchema}
				columns={athleteBulkColumns}
				onSubmit={async (athletes) => {
					await bulkCreateAthletes.mutateAsync({ athletes });
				}}
			/>
			<AthleteDetailsDrawer
				isOpen={!!selectedAthlete}
				athlete={selectedAthlete}
				activities={activities}
				athleteStats={athleteStats}
				canEdit={isAdmin}
				startEditing={isEditingAthlete}
				onSubmit={async (data) => {
					await updateAthlete.mutateAsync(data);
				}}
				onClose={() => router.push(routes.members.list())}
			/>
		</SidebarProvider>
	);
};
