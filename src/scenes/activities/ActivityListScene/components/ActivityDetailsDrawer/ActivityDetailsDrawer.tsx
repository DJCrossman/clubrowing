"use client";

import { IconShare3 } from "@tabler/icons-react";
import { DateTime } from "luxon";
import { useState } from "react";
import { toast } from "sonner";
import { ShareToChatDialog } from "@/components/chat/share-to-chat-dialog";
import {
	DetailList,
	DetailRow,
	DetailTile,
	DetailTiles,
} from "@/components/drawer-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerCloseButton,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { useCurrentUser } from "@/hooks/useAuth";
import {
	formatCompactDuration,
	formatCompactSplit,
	formatMeters,
} from "@/lib/formatters";
import { routes } from "@/lib/routes";
import type { Activity, Boats, Ergs, Workouts } from "@/lib/trpc/types";
import type {
	Concept2Activity,
	Concept2Strokes,
	UpdateActivity,
} from "@/schemas";
import { ActivityForm } from "../ActivityForm/ActivityForm";
import { ActivityScreenshot } from "./ActivityScreenshot";
import { ActivitySplitsTable } from "./ActivitySplitsTable";
import { ActivityStrokesChart } from "./ActivityStrokesChart";
import { ActivityStrokesChartSkeleton } from "./ActivityStrokesChartSkeleton";

interface ActivityDetailsDrawerProps {
	isOpen: boolean;
	activity?: Activity;
	strokes?: Concept2Strokes | null;
	isStrokesLoading: boolean;
	boats: Boats;
	ergs: Ergs;
	workouts: Workouts;
	onClose: () => void;
	onSubmit: (data: UpdateActivity) => Promise<void> | void;
	onAddScreenshot: (params: {
		activityId: string;
		file: File;
	}) => Promise<void>;
}

export const ActivityDetailsDrawer = ({
	isOpen,
	activity,
	strokes,
	isStrokesLoading,
	boats,
	ergs,
	workouts,
	onClose,
	onSubmit,
	onAddScreenshot,
}: ActivityDetailsDrawerProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isImageFullscreen, setIsImageFullscreen] = useState(false);
	const [isSharing, setIsSharing] = useState(false);
	const { user, hasAthlete } = useCurrentUser();

	if (!activity) {
		return null;
	}

	// tRPC infers every field of the loose Concept2 schema as unknown.
	const conceptTwoData =
		activity.type === "erg"
			? (activity.conceptTwoData as Concept2Activity | undefined)
			: undefined;
	const strokeRate =
		conceptTwoData?.stroke_rate || activity.stravaData?.average_cadence;
	const heartRate =
		conceptTwoData?.heart_rate?.average ||
		activity.stravaData?.average_heartrate;
	// Concept2's watts formula, with pace in seconds per metre.
	const averageWatts =
		conceptTwoData && activity.distance > 0 && activity.elapsedTime > 0
			? 2.8 / (activity.elapsedTime / 1000 / activity.distance) ** 3
			: activity.stravaData?.average_watts;
	const maxHeartRate =
		conceptTwoData?.heart_rate?.max ||
		Math.max(
			0,
			...(
				conceptTwoData?.workout?.intervals ??
				conceptTwoData?.workout?.splits ??
				[]
			).map((part) => part.heart_rate?.max ?? 0),
		) ||
		activity.stravaData?.max_heartrate;

	const handleClose = () => {
		setIsEditing(false);
		setIsSharing(false);
		onClose();
	};

	return (
		<Drawer
			open={isOpen}
			onOpenChange={(open) => !open && handleClose()}
			direction="right"
			dismissible={!isImageFullscreen && !isSharing}
		>
			<DrawerContent>
				<DrawerHeader className="flex flex-row items-start justify-between gap-3 border-b">
					<div className="flex min-w-0 flex-col gap-1.5">
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge
								variant="secondary"
								className={
									activity.type === "water"
										? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
										: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
								}
							>
								{activity.type === "water" ? "Water" : "Erg"}
							</Badge>
							{conceptTwoData && <Badge variant="outline">Concept2</Badge>}
							{activity.isStrava && <Badge variant="outline">Strava</Badge>}
						</div>
						<DrawerTitle className="truncate text-lg">
							{activity.name}
						</DrawerTitle>
						<DrawerDescription>
							{DateTime.fromISO(activity.startDate).toLocaleString({
								weekday: "short",
								month: "short",
								day: "numeric",
								hour: "numeric",
								minute: "2-digit",
							})}
						</DrawerDescription>
					</div>
					<DrawerCloseButton />
				</DrawerHeader>
				<ShareToChatDialog
					open={isSharing}
					onOpenChange={setIsSharing}
					title={activity.name}
					path={routes.activities.view(activity.id)}
				/>
				<div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
					{isEditing && (
						<ActivityForm
							boats={boats}
							ergs={ergs}
							workouts={workouts}
							defaultValues={
								activity.type === "water"
									? {
											type: "water",
											name: activity.name,
											startDate: activity.startDate,
											timezone: activity.timezone,
											workoutType: activity.workoutType,
											elapsedTime: activity.elapsedTime,
											athleteId: activity.athlete.id,
											boatId: activity.boat?.id,
											workoutId: activity.workout?.id,
											isHidden: activity.isHidden,
											laps: activity.distance / 2000,
											courseType: "course",
										}
									: {
											type: "erg",
											name: activity.name,
											startDate: activity.startDate,
											timezone: activity.timezone,
											workoutType: activity.workoutType,
											elapsedTime: activity.elapsedTime,
											distance: activity.distance,
											athleteId: activity.athlete.id,
											ergId: activity.erg?.id,
											workoutId: activity.workout?.id,
											isHidden: activity.isHidden,
										}
							}
							canHide
							canChangeType={!conceptTwoData}
							canAddScreenshot={!activity.hasScreenshot}
							onCancel={() => setIsEditing(false)}
							onSubmit={async ({ data, screenshot }) => {
								await onSubmit({ id: activity.id, ...data });
								if (screenshot) {
									await onAddScreenshot({
										activityId: activity.id,
										file: screenshot,
									}).catch((error: unknown) => {
										toast.error(
											error instanceof Error
												? error.message
												: "The screenshot couldn't be saved. Try again.",
										);
									});
								}
								setIsEditing(false);
							}}
							isImageFullscreen={isImageFullscreen}
							setIsImageFullscreen={setIsImageFullscreen}
						/>
					)}
					{!isEditing && (
						<>
							<DetailTiles>
								<DetailTile label="Distance">
									{formatMeters(activity.distance)}
								</DetailTile>
								<DetailTile label="Time">
									{formatCompactDuration(activity.elapsedTime)}
								</DetailTile>
								{activity.distance > 0 && (
									<DetailTile label="Avg split">
										{formatCompactSplit(
											activity.elapsedTime,
											activity.distance,
										)}
										<span className="text-xs font-normal text-muted-foreground">
											{" "}
											/500m
										</span>
									</DetailTile>
								)}
								<DetailTile label="Workout type">
									{activity.workoutType.charAt(0).toUpperCase() +
										activity.workoutType.slice(1)}
								</DetailTile>
								{!!strokeRate && (
									<DetailTile label="Avg rate" className="last:odd:col-span-2">
										{Math.round(strokeRate)}
										<span className="text-xs font-normal text-muted-foreground">
											{" "}
											spm
										</span>
									</DetailTile>
								)}
								{!!heartRate && (
									<DetailTile
										label="Heart rate"
										className="last:odd:col-span-2"
									>
										{Math.round(heartRate)}
										<span className="text-xs font-normal text-muted-foreground">
											{" "}
											bpm
										</span>
									</DetailTile>
								)}
							</DetailTiles>
							{conceptTwoData?.workout && (
								<ActivitySplitsTable workout={conceptTwoData.workout} />
							)}
							{isStrokesLoading && <ActivityStrokesChartSkeleton />}
							{!!strokes?.length && (
								<ActivityStrokesChart
									strokes={strokes}
									workout={conceptTwoData?.workout}
								/>
							)}
							<DetailList>
								{!!averageWatts && (
									<DetailRow label="Avg watts">
										{Math.round(averageWatts)} W
									</DetailRow>
								)}
								{!!conceptTwoData?.calories_total && (
									<DetailRow label="Calories">
										{conceptTwoData.calories_total}
									</DetailRow>
								)}
								{!!maxHeartRate && (
									<DetailRow label="Max heart rate">
										{Math.round(maxHeartRate)} bpm
									</DetailRow>
								)}
								{!!conceptTwoData?.drag_factor && (
									<DetailRow label="Drag factor">
										{conceptTwoData.drag_factor}
									</DetailRow>
								)}
								{!!conceptTwoData?.stroke_count && (
									<DetailRow label="Strokes">
										{conceptTwoData.stroke_count}
									</DetailRow>
								)}
								{!!conceptTwoData?.rest_time && (
									<DetailRow label="Rest">
										{formatCompactDuration(conceptTwoData.rest_time * 100)}
									</DetailRow>
								)}
								<DetailRow label="Athlete">{activity.athlete.name}</DetailRow>
								{activity.type === "water" && activity.boat && (
									<DetailRow label="Boat">{activity.boat.name}</DetailRow>
								)}
								{activity.type === "erg" && activity.erg && (
									<DetailRow label="ERG">{activity.erg.name}</DetailRow>
								)}
								{activity.workout && (
									<DetailRow label="Workout">
										{activity.workout.description}
									</DetailRow>
								)}
								{conceptTwoData && (
									<DetailRow label="Source">
										Synced from Concept2{activity.isStrava && " and Strava"}
									</DetailRow>
								)}
								{!conceptTwoData && activity.isStrava && (
									<DetailRow label="Source">Synced from Strava</DetailRow>
								)}
								{conceptTwoData?.comments && (
									<DetailRow label="Comments">
										{conceptTwoData.comments}
									</DetailRow>
								)}
							</DetailList>
							<ActivityScreenshot
								key={activity.id}
								activity={activity}
								isImageFullscreen={isImageFullscreen}
								setIsImageFullscreen={setIsImageFullscreen}
							/>
						</>
					)}
				</div>
				{!isEditing && hasAthlete && activity.athlete.id === user.id && (
					<DrawerFooter className="flex-row border-t">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => setIsSharing(true)}
						>
							<IconShare3 />
							Share to chat
						</Button>
						<Button className="flex-1" onClick={() => setIsEditing(true)}>
							Edit
						</Button>
					</DrawerFooter>
				)}
			</DrawerContent>
		</Drawer>
	);
};
