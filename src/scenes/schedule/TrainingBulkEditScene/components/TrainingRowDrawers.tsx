"use client";

import type { DateTime } from "luxon";
import { toast } from "sonner";
import type { ChatTarget } from "@/lib/chat/targets";
import { withErrorToast } from "@/lib/toast";
import { trpcClient } from "@/lib/trpc/client";
import type { ScheduleEvent } from "@/lib/trpc/types";
import { type CreateEvent, trainingRowSchema } from "@/schemas";
import {
	EventCreateDrawer,
	EventDetailsDrawer,
} from "../../ScheduleScene/components";
import {
	applyEventToRow,
	type BulkRow,
	rowToFormValues,
	rowToScheduleEvent,
	stripInternal,
} from "../utils/trainingRows";

interface TrainingRowDrawersProps {
	row: BulkRow | null;
	savedEvent: ScheduleEvent | undefined;
	weekStart: DateTime;
	isSharing: boolean;
	shareTargets: ChatTarget[];
	isLoadingShareTargets: boolean;
	onChange: (row: BulkRow) => void;
	onRemove: () => void;
	onClose: () => void;
	onSharingChange: (isSharing: boolean) => void;
	onShare: (share: { target: ChatTarget; text: string }) => Promise<string>;
}

// The drawers edit the grid row, not the database — the coach still saves the
// whole week in one go, so a form edit can't half-commit ahead of the rest.
export const TrainingRowDrawers = ({
	row,
	savedEvent,
	weekStart,
	isSharing,
	shareTargets,
	isLoadingShareTargets,
	onChange,
	onRemove,
	onClose,
	onSharingChange,
	onShare,
}: TrainingRowDrawersProps) => {
	const createEvent = trpcClient.schedule.createEvent.useMutation();
	const parsed = row ? trainingRowSchema.safeParse(stripInternal(row)) : null;
	// A saved row that's currently valid opens the full event drawer; anything
	// else (new, or mid-edit and incomplete) opens the create form prefilled.
	const event =
		savedEvent && parsed?.success
			? rowToScheduleEvent(parsed.data, savedEvent, weekStart)
			: null;

	const applyFormResult = async (input: CreateEvent) => {
		if (!row) return;
		// The grid only holds training, so a regatta or volunteer shift goes straight
		// onto the schedule instead of becoming a row the week's save would reject.
		if (input.type !== "training") {
			if (row.eventId) {
				toast.error("A saved training session can't change type");
				return;
			}
			await withErrorToast(createEvent.mutateAsync(input));
			toast.success(`${input.title} added to the schedule`);
			onRemove();
			return;
		}
		onChange(applyEventToRow(row, input, weekStart));
	};

	return (
		<>
			<EventDetailsDrawer
				event={event}
				responses={null}
				analytics={null}
				isAdmin
				isSharing={isSharing}
				shareTargets={shareTargets}
				isLoadingShareTargets={isLoadingShareTargets}
				onClose={onClose}
				onSubmit={applyFormResult}
				onDelete={async () => onRemove()}
				onSharingChange={onSharingChange}
				onShare={onShare}
			/>
			<EventCreateDrawer
				isOpen={!!row && !event}
				defaultDate={
					weekStart.plus({ days: row?.dayIndex ?? 0 }).toISODate() ?? ""
				}
				defaultValues={row ? rowToFormValues(row, weekStart) : undefined}
				onClose={onClose}
				onSubmit={applyFormResult}
			/>
		</>
	);
};
