"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { default as React } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Heading } from "@/components/ui/heading";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useTable } from "@/hooks/useTable";
import { routes } from "@/lib/routes";
import { toastError } from "@/lib/toast";
import { trpcClient } from "@/lib/trpc/client";
import type { Activities, Athletes, Erg, ErgsResult } from "@/lib/trpc/types";
import { ErgCreateDrawer, ErgDetailsDrawer, ErgTable } from "./components";

const sortColumns = [
	"name",
	"manufacturer",
	"serialNumber",
	"firmwareVersion",
] as const;

interface IProps {
	initialData: ErgsResult;
	selectedErg: Erg | null;
	activities?: Activities;
	athletes?: Athletes;
	isCreateDrawerOpen: boolean;
}

export const ErgListScene = ({
	initialData,
	selectedErg,
	activities = [],
	athletes,
	isCreateDrawerOpen,
}: IProps) => {
	const router = useRouter();
	const utils = trpcClient.useUtils();
	const table = useTable();
	const { data: ergs } = trpcClient.ergs.getErgs.useQuery(
		{
			page: table.page,
			pageSize: table.pageSize,
			sortBy: sortColumns.find((column) => column === table.sortBy),
			order: table.order,
		},
		{ initialData, placeholderData: keepPreviousData },
	);
	const createErg = trpcClient.ergs.createErg.useMutation({
		onSuccess: async () => {
			await utils.ergs.getErgs.invalidate();
			router.push(routes.ergs.list());
			router.refresh();
		},
	});
	const updateErg = trpcClient.ergs.updateErg.useMutation({
		onSuccess: async () => {
			await utils.ergs.getErgs.invalidate();
			await utils.ergs.getErgById.invalidate();
			router.refresh();
		},
	});
	const { mutate: markErg, isPending: isMarking } =
		trpcClient.ergs.markErg.useMutation({
			onSuccess: async () => {
				await utils.ergs.getErgs.invalidate();
				await utils.ergs.getErgById.invalidate();
				router.refresh();
			},
			onError: async (error) => {
				if (error.data?.code !== "NOT_FOUND") {
					toastError(error);
					return;
				}
				toast.error("This erg has already been marked");
				await utils.ergs.getErgs.invalidate();
				await utils.ergs.getErgById.invalidate();
				router.refresh();
			},
		});

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader breadcrumbs={[{ label: "ERGs" }]} />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex items-center justify-between p-4 lg:px-6">
							<Heading as="h1">ERGs</Heading>
						</div>
						<div className="flex flex-col gap-4 md:gap-6">
							<ErgTable data={ergs} {...table} />
						</div>
					</div>
				</div>
			</SidebarInset>
			<ErgCreateDrawer
				isOpen={isCreateDrawerOpen}
				athletes={athletes}
				onSubmit={async (data) => {
					await createErg.mutateAsync(data);
				}}
				onClose={() => router.push(routes.ergs.list())}
			/>
			<ErgDetailsDrawer
				isOpen={!!selectedErg}
				erg={selectedErg}
				activities={activities}
				athletes={athletes}
				onSubmit={async (data) => {
					await updateErg.mutateAsync(data);
				}}
				onMark={() => {
					if (!selectedErg) return;
					markErg({ id: selectedErg.id });
				}}
				isMarking={isMarking}
				onClose={() => router.push(routes.ergs.list())}
			/>
		</SidebarProvider>
	);
};
