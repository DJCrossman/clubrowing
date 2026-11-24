"use client";

import {
	IconCalendarEvent,
	IconMapPin,
	IconPencil,
	IconPlus,
	IconShare3,
	IconTrash,
	IconUsersGroup,
} from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { ShareToChatDialog } from "@/components/chat/share-to-chat-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerCloseButton,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import type { ChatTarget } from "@/lib/chat/targets";
import {
	formatActivityType,
	formatDuration,
	formatMeters,
} from "@/lib/formatters";
import { getMapsSearchUrl } from "@/lib/maps";
import { routes } from "@/lib/routes";
import { formatEventDate } from "@/lib/schedule/event-labels";
import type {
	AnalyticMetrics,
	EventResponses,
	ScheduleEvent,
} from "@/lib/trpc/types";
import { cn } from "@/lib/utils";
import type { CreateEvent } from "@/schemas";
import { intensityColorMap } from "../../utils/intensityColorMap";
import { EventDetailsForm } from "../EventDetailsForm/EventDetailsForm";
import { EventResponsesList } from "../EventResponsesList/EventResponsesList";
import { EventTypeBadge } from "../EventTypeBadge/EventTypeBadge";
import { EventWorkoutForm } from "../EventWorkoutForm/EventWorkoutForm";
import { FragmentList } from "../FragmentList/FragmentList";
import {
	NotifyToggle,
	notifyAthletesLabel,
} from "../NotifyToggle/NotifyToggle";

interface EventDetailsDrawerProps {
	event: ScheduleEvent | null;
	responses: EventResponses | null;
	analytics: Pick<AnalyticMetrics, "lastTwoKm" | "lastSixKm"> | null;
	isAdmin: boolean;
	/** Athletes a change would reach; the notify checkbox shows only when set. */
	notifyCount?: number;
	isSharing: boolean;
	shareTargets: ChatTarget[];
	isLoadingShareTargets: boolean;
	onClose: () => void;
	onSubmit: (input: CreateEvent, options: { notify: boolean }) => Promise<void>;
	onDelete: (eventId: string, options: { notify: boolean }) => Promise<void>;
	onSharingChange: (isSharing: boolean) => void;
	onShare: (share: { target: ChatTarget; text: string }) => Promise<string>;
}

export const EventDetailsDrawer = ({
	event,
	responses,
	analytics,
	isAdmin,
	notifyCount = 0,
	isSharing,
	shareTargets,
	isLoadingShareTargets,
	onClose,
	onSubmit,
	onDelete,
	onSharingChange,
	onShare,
}: EventDetailsDrawerProps) => {
	const [editing, setEditing] = useState<"details" | "workout" | null>(null);
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [notify, setNotify] = useState(true);

	if (!event) {
		return null;
	}

	const { workout } = event;

	return (
		<Drawer open onOpenChange={(open) => !open && onClose()} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
				<DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b">
					<div className="flex min-w-0 items-center gap-3">
						<DrawerTitle className="truncate">{event.title}</DrawerTitle>
						<EventTypeBadge type={event.type} label={event.typeLabel} />
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onSharingChange(true)}
						>
							<IconShare3 />
							Share to chat
						</Button>
						<DrawerCloseButton />
					</div>
				</DrawerHeader>
				<ShareToChatDialog
					open={isSharing}
					title={event.title}
					path={routes.schedule.view({ id: event.id })}
					targets={shareTargets}
					isLoadingTargets={isLoadingShareTargets}
					onOpenChange={onSharingChange}
					onShare={onShare}
				/>
				<div className="flex-1 space-y-8 overflow-y-auto p-6">
					{isAdmin && !editing && (
						<div className="flex flex-wrap items-center justify-end gap-2">
							{isConfirmingDelete ? (
								<>
									<span className="mr-auto text-sm">
										Delete this event{workout && " and its workout"}?
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setIsConfirmingDelete(false)}
									>
										Cancel
									</Button>
									<Button
										type="button"
										variant="destructive"
										size="sm"
										disabled={isDeleting}
										onClick={async () => {
											setIsDeleting(true);
											try {
												await onDelete(event.id, { notify });
											} finally {
												setIsDeleting(false);
											}
										}}
									>
										Delete
									</Button>
									{notifyCount > 0 && (
										<div className="basis-full">
											<NotifyToggle
												label={notifyAthletesLabel(notifyCount)}
												checked={notify}
												onCheckedChange={setNotify}
											/>
										</div>
									)}
								</>
							) : (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										setNotify(true);
										setIsConfirmingDelete(true);
									}}
								>
									<IconTrash />
									Delete event
								</Button>
							)}
						</div>
					)}
					<section className="space-y-4">
						<SectionHeader
							title="Details"
							canEdit={isAdmin && !editing}
							onEdit={() => {
								setNotify(true);
								setEditing("details");
							}}
						/>
						{editing === "details" ? (
							<>
								{notifyCount > 0 && (
									<NotifyToggle
										label={`${notifyAthletesLabel(notifyCount)} if the time or location changes`}
										checked={notify}
										onCheckedChange={setNotify}
									/>
								)}
								<EventDetailsForm
									event={event}
									onSubmit={async (input) => {
										await onSubmit(input, { notify });
										setEditing(null);
									}}
									onCancel={() => setEditing(null)}
								/>
							</>
						) : (
							<dl className="space-y-4">
								<DetailRow icon={IconCalendarEvent} label="When">
									{formatEventDate(event.startAt, event.timezone)} ·{" "}
									{event.timeLabel}
								</DetailRow>
								{event.location && (
									<DetailRow icon={IconMapPin} label="Location">
										<a
											href={getMapsSearchUrl(event.location)}
											target="_blank"
											rel="noreferrer"
											className="hover:underline"
										>
											{event.location}
										</a>
									</DetailRow>
								)}
								<DetailRow icon={IconUsersGroup} label="Who">
									{event.groupLabel}
									{event.volunteer &&
										` · ${event.volunteer.filled} / ${event.volunteer.spots} filled`}
								</DetailRow>
								{event.description && (
									<div>
										<dt className="text-xs text-muted-foreground">Notes</dt>
										<dd className="text-sm whitespace-pre-line">
											{event.description}
										</dd>
									</div>
								)}
							</dl>
						)}
					</section>
					{(workout || (event.type === "training" && isAdmin)) && (
						<section className="space-y-3">
							<SectionHeader
								title="Workout"
								canEdit={isAdmin && !editing}
								isAdding={!workout}
								onEdit={() => setEditing("workout")}
							>
								{workout && (
									<>
										<Badge
											className={cn(
												"border-transparent",
												intensityColorMap[workout.intensityCategory],
											)}
										>
											{workout.intensityCategory}
										</Badge>
										<Badge variant="outline">
											{formatActivityType(workout.activityType)}
										</Badge>
									</>
								)}
							</SectionHeader>
							{editing === "workout" ? (
								<EventWorkoutForm
									event={event}
									onSubmit={async (input) => {
										// Workout edits never notify, so there's no choice to offer.
										await onSubmit(input, { notify: true });
										setEditing(null);
									}}
									onCancel={() => setEditing(null)}
								/>
							) : workout ? (
								<>
									<p className="text-sm">
										{workout.description
											.split(";")
											.map((line) => line.trim())
											.filter(Boolean)
											.map((line) => (
												<span key={line} className="block">
													{line}
												</span>
											))}
									</p>
									{(workout.elapsedTime || workout.distance) && (
										<p className="text-sm text-muted-foreground">
											{[
												workout.elapsedTime &&
													formatDuration(workout.elapsedTime),
												workout.distance && formatMeters(workout.distance),
											]
												.filter(Boolean)
												.join(" · ")}
										</p>
									)}
									{workout.fragments.length > 0 && (
										<FragmentList
											fragments={workout.fragments}
											analytics={analytics}
										/>
									)}
								</>
							) : (
								<p className="text-sm text-muted-foreground">
									No workout planned yet.
								</p>
							)}
						</section>
					)}
					{responses && !editing && (
						<section className="space-y-3">
							<SectionHeader title="Responses" />
							<EventResponsesList type={event.type} responses={responses} />
						</section>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
};

const SectionHeader = ({
	title,
	canEdit = false,
	isAdding = false,
	onEdit,
	children,
}: {
	title: string;
	canEdit?: boolean;
	isAdding?: boolean;
	onEdit?: () => void;
	children?: React.ReactNode;
}) => (
	<div className="flex items-center gap-2">
		<h3 className="text-sm font-semibold">{title}</h3>
		{children}
		{canEdit && (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="ml-auto"
				onClick={onEdit}
			>
				{isAdding ? <IconPlus /> : <IconPencil />}
				{isAdding ? "Add" : "Edit"}
			</Button>
		)}
	</div>
);

const DetailRow = ({
	icon: Icon,
	label,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	children: React.ReactNode;
}) => (
	<div className="flex gap-3">
		<Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
		<div className="min-w-0">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="text-sm">{children}</dd>
		</div>
	</div>
);
