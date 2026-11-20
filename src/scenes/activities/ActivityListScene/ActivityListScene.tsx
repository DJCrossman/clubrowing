"use client";

import { IconPlus, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { AthleteProfilePrompt } from "@/components/athlete-profile-prompt";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/useAuth";
import { fitPhotoToUploadLimit } from "@/lib/fit-photo-to-upload-limit";
import { routes } from "@/lib/routes";
import { trpcClient } from "@/lib/trpc/client";
import type {
	ActivitiesResult,
	Activity,
	Athlete,
	Athletes,
	Boats,
	Ergs,
	Workouts,
} from "@/lib/trpc/types";
import { IntegrationAlert } from "@/scenes/dashboard/DashboardScene/components";
import type { CreateActivity } from "@/schemas";
import {
	ActivityCreateDrawer,
	ActivityDetailsDrawer,
	ActivityTable,
} from "./components";
import type { UploadErgActivityScreenshot } from "./components/ActivityForm/ActivityForm";
import { SyncMenu } from "./components/ActivityTable/SyncMenu";

interface ActivityListSceneProps {
	initialData?: ActivitiesResult;
	athletes?: Athletes;
	athleteIds?: string[];
	selectedActivity?: Activity;
	currentAthlete?: Athlete;
	boats: Boats;
	ergs: Ergs;
	workouts: Workouts;
	isCreateDrawerOpen: boolean;
}

const uploadErgActivityScreenshot: UploadErgActivityScreenshot = async ({
	file,
	athleteId,
	ergId,
}) => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("athleteId", athleteId);
	if (ergId) formData.append("ergId", ergId);

	const response = await fetch("/api/v1/activities/screenshot", {
		method: "POST",
		body: formData,
	});
	if (!response.ok) {
		return { success: false };
	}
	return (await response.json()) as {
		success: boolean;
		data?: CreateActivity;
	};
};

export const ActivityListScene = ({
	initialData = {
		data: [],
		totalCount: 0,
		page: 1,
		pageSize: 20,
		totalPages: 1,
	},
	athletes,
	athleteIds,
	selectedActivity,
	currentAthlete,
	boats,
	ergs,
	workouts,
	isCreateDrawerOpen,
}: ActivityListSceneProps) => {
	const router = useRouter();
	const { hasAthlete } = useCurrentUser();
	// The list row already holds the whole activity, so the drawer shows it
	// while the navigation that loads it from the server is still in flight.
	const [openActivity, setOpenActivity] = useOptimistic(selectedActivity);
	const listHref = athleteIds?.length
		? `${routes.activities.list()}?athleteIds=${athleteIds.join(",")}`
		: routes.activities.list();
	const strokesQuery = trpcClient.activities.getActivityStrokes.useQuery(
		{ id: openActivity?.id ?? "" },
		{
			enabled:
				openActivity?.type === "erg" &&
				!!openActivity.conceptTwoData?.stroke_data,
		},
	);
	const utils = trpcClient.useUtils();
	const createActivity = trpcClient.activities.createActivity.useMutation({
		onSuccess: async () => {
			await utils.activities.getActivities.invalidate();
			router.push(listHref);
			router.refresh();
		},
	});
	const updateActivity = trpcClient.activities.updateActivity.useMutation({
		onSuccess: async () => {
			await utils.activities.getActivities.invalidate();
			await utils.activities.getActivityById.invalidate();
			router.refresh();
		},
	});
	const attachActivityScreenshot =
		trpcClient.activities.attachActivityScreenshot.useMutation({
			onSettled: async () => {
				await utils.activities.getActivities.invalidate();
				await utils.activities.getActivityById.invalidate();
				router.refresh();
			},
		});
	const keepActivityScreenshot = async ({
		activityId,
		file,
	}: {
		activityId: string;
		file: File;
	}) => {
		const formData = new FormData();
		formData.append(
			"file",
			await fitPhotoToUploadLimit({ file, longEdge: 800 }),
		);
		formData.append("kind", "screenshot");
		const response = await fetch("/api/v1/uploads", {
			method: "POST",
			body: formData,
		}).catch(() => null);
		const body = (await response?.json().catch(() => null)) as {
			id?: string;
			error?: string;
		} | null;
		if (!response?.ok || !body?.id) {
			throw new Error(
				body?.error ?? "The screenshot couldn't be saved. Try again.",
			);
		}
		await attachActivityScreenshot.mutateAsync({
			id: activityId,
			uploadId: body.id,
		});
	};

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
				<SiteHeader breadcrumbs={[{ label: "Activities" }]} />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<MobilePageHeader
							title="Activities"
							actions={
								<>
									<SyncMenu
										trigger={
											<Button
												variant="outline"
												size="icon-lg"
												className="rounded-xl"
												aria-label="Sync activities"
											>
												<IconRefresh />
											</Button>
										}
									/>
									<Button
										size="icon-lg"
										className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
										aria-label="Add Activity"
										render={
											<Link
												href={`${routes.activities.create()}${athleteIds?.length ? `&athleteIds=${athleteIds.join(",")}` : ""}`}
											/>
										}
									>
										<IconPlus />
									</Button>
								</>
							}
						/>
						{!hasAthlete && (
							<div className="px-4 lg:px-6">
								<AthleteProfilePrompt />
							</div>
						)}
						<IntegrationAlert />
						<div className="flex items-center justify-between p-4 max-md:hidden lg:px-6">
							<Heading as="h1">Activities</Heading>
						</div>
						<div className="flex flex-col gap-4 md:gap-6">
							<ActivityTable
								initialData={initialData}
								athletes={athletes}
								athleteIds={athleteIds}
								onOpenActivity={(activity) =>
									startTransition(() => setOpenActivity(activity))
								}
							/>
						</div>
					</div>
				</div>
			</SidebarInset>
			{!!currentAthlete && (
				<ActivityCreateDrawer
					isOpen={isCreateDrawerOpen}
					currentAthlete={currentAthlete}
					boats={boats}
					ergs={ergs}
					workouts={workouts}
					onSubmit={async ({ data, screenshot }) => {
						const activity = await createActivity.mutateAsync(data);
						if (!screenshot) return;
						keepActivityScreenshot({
							activityId: activity.id,
							file: screenshot,
						}).catch((error) =>
							toast.error(
								`The activity was saved, but the screenshot couldn't be kept: ${error instanceof Error ? error.message : "Something went wrong."} You can add it from the activity.`,
							),
						);
					}}
					onUploadErgActivityScreenshot={uploadErgActivityScreenshot}
					onClose={() => router.push(listHref)}
				/>
			)}
			<ActivityDetailsDrawer
				isOpen={!!openActivity}
				activity={openActivity}
				strokes={strokesQuery.data}
				isStrokesLoading={strokesQuery.isLoading}
				boats={boats}
				ergs={ergs}
				workouts={workouts}
				onSubmit={async (data) => {
					await updateActivity.mutateAsync(data);
				}}
				onAddScreenshot={keepActivityScreenshot}
				onClose={() =>
					startTransition(() => {
						setOpenActivity(undefined);
						router.push(listHref);
					})
				}
			/>
		</SidebarProvider>
	);
};
