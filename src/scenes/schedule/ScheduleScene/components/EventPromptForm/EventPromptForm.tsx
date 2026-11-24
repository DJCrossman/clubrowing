"use client";

import { IconPencil } from "@tabler/icons-react";
import { DateTime } from "luxon";
import { type ReactNode, useState } from "react";
import type { ParsedPromptEvent } from "@/app/api/v1/events/parse-prompt/route";
import type { ParseDescriptionResult } from "@/app/api/v1/workouts/parse-description/route";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	EVENT_TYPE_LABELS,
	formatEventTime,
} from "@/lib/schedule/event-labels";
import {
	type CreateEvent,
	type EventFormInput,
	type EventType,
	EventTypes,
	eventFormSchema,
} from "@/schemas";
import { getPromptEventFormValues } from "../../utils/getPromptEventFormValues";
import { EventCreateForm } from "../EventCreateForm/EventCreateForm";
import { EventTypeBadge } from "../EventTypeBadge/EventTypeBadge";
import type { ReadWorkoutDescription } from "../WorkoutFields/WorkoutFields";
import { PromptSummary } from "./PromptSummary";

export type ReadEventsPrompt = (input: {
	prompt: string;
	type: EventType;
	startDate: string;
	repeatUntil?: string;
}) => Promise<{
	events: ParsedPromptEvent[];
	workouts: Map<string, ParseDescriptionResult>;
}>;

const PLACEHOLDERS: Record<EventType, string> = {
	training:
		"Mon/Wed/Fri 6am erg 60' steady state C6\nThursday 6pm water 3x5km C5",
	regatta:
		"Saturday Wascana regatta all day\n2026-11-14 7am SRA Erg Series 6km",
	volunteer:
		"Sunday 9-11 dock setup, 3 volunteers\nSaturday 8am regatta marshals, 6 spots",
	social:
		"Saturday 5pm barbecue at the boathouse\n2026-12-12 6pm Christmas party",
};

interface PromptItem {
	event: CreateEvent;
	values: EventFormInput;
}

interface EventPromptFormProps {
	startDate: string;
	afterType?: ReactNode;
	isReadingEventsPrompt: boolean;
	isReadingWorkoutDescription: boolean;
	onReadEventsPrompt: ReadEventsPrompt;
	onReadWorkoutDescription: ReadWorkoutDescription;
	onSubmit: (inputs: CreateEvent[]) => Promise<void>;
	onCancel: () => void;
}

export function EventPromptForm({
	startDate,
	afterType,
	isReadingEventsPrompt,
	isReadingWorkoutDescription,
	onReadEventsPrompt,
	onReadWorkoutDescription,
	onSubmit,
	onCancel,
}: EventPromptFormProps) {
	const [type, setType] = useState<EventType>("training");
	const [prompt, setPrompt] = useState("");
	const [repeatUntil, setRepeatUntil] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submittedPrompt, setSubmittedPrompt] = useState("");
	const [items, setItems] = useState<PromptItem[] | null>(null);
	const [skippedCount, setSkippedCount] = useState(0);
	const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const selected =
		items
			?.filter((_, index) => !excluded.has(index))
			.map(({ event }) => event) ?? [];

	if (items) {
		if (editingIndex !== null) {
			return (
				<div className="space-y-6">
					<PromptSummary prompt={submittedPrompt} />
					<EventCreateForm
						key={editingIndex}
						defaultValues={items[editingIndex].values}
						isReadingWorkoutDescription={isReadingWorkoutDescription}
						onReadWorkoutDescription={onReadWorkoutDescription}
						onSubmit={async (event, values) => {
							setItems((current) =>
								(current ?? []).map((item, index) =>
									index === editingIndex ? { event, values } : item,
								),
							);
							setEditingIndex(null);
						}}
						onCancel={() => setEditingIndex(null)}
					/>
				</div>
			);
		}

		return (
			<div className="space-y-6">
				<PromptSummary prompt={submittedPrompt} />
				<div className="space-y-1">
					<p className="text-sm font-medium">
						{items.length} {items.length === 1 ? "event" : "events"} found
					</p>
					<p className="text-sm text-muted-foreground">
						Untick any you don't want, or edit one before it's created.
						{skippedCount > 0 &&
							` ${skippedCount} couldn't be read and ${skippedCount === 1 ? "was" : "were"} left out.`}
					</p>
				</div>
				<ul className="divide-y rounded-md border">
					{items.map(({ event }, index) => {
						const id = `prompt-event-${index}`;
						return (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: the parsed list never reorders
								key={index}
								className="flex items-start gap-3 p-3"
							>
								<Checkbox
									id={id}
									className="mt-0.5"
									checked={!excluded.has(index)}
									onCheckedChange={(checked) =>
										setExcluded((current) => {
											const next = new Set(current);
											if (checked) next.delete(index);
											else next.add(index);
											return next;
										})
									}
								/>
								<Label
									htmlFor={id}
									className="flex flex-1 flex-col items-start gap-1 font-normal"
								>
									<span className="flex flex-wrap items-center gap-2">
										<span className="font-medium">{event.title}</span>
										<EventTypeBadge
											type={event.type}
											label={EVENT_TYPE_LABELS[event.type]}
										/>
									</span>
									<span className="text-muted-foreground">
										{DateTime.fromISO(event.startAt, {
											zone: event.timezone,
										}).toFormat("ccc d LLL")}{" "}
										·{" "}
										{formatEventTime({ ...event, endAt: event.endAt ?? null })}
										{event.location && ` · ${event.location}`}
									</span>
									{event.workout && (
										<span className="text-muted-foreground">
											{event.workout.intensityCategory} ·{" "}
											{event.workout.description}
										</span>
									)}
								</Label>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="-my-1 size-8"
									aria-label={`Edit ${event.title}`}
									onClick={() => setEditingIndex(index)}
								>
									<IconPencil />
								</Button>
							</li>
						);
					})}
				</ul>
				<div className="flex items-center justify-between gap-4">
					<Button
						type="button"
						variant="outline"
						disabled={isSubmitting}
						onClick={() => setItems(null)}
					>
						Back
					</Button>
					<Button
						type="button"
						disabled={isSubmitting || selected.length === 0}
						onClick={async () => {
							setIsSubmitting(true);
							try {
								await onSubmit(selected);
							} finally {
								setIsSubmitting(false);
							}
						}}
					>
						Create {selected.length}{" "}
						{selected.length === 1 ? "event" : "events"}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form
			className="space-y-6"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(null);
				try {
					const { events, workouts } = await onReadEventsPrompt({
						prompt: prompt.trim(),
						type,
						startDate,
						repeatUntil: repeatUntil || undefined,
					});
					const parsed = events.flatMap((promptEvent): PromptItem[] => {
						const values = getPromptEventFormValues(
							promptEvent,
							promptEvent.workout &&
								workouts.get(promptEvent.workout.description),
						);
						const event = eventFormSchema.safeParse(values);
						return event.success ? [{ event: event.data, values }] : [];
					});
					if (parsed.length === 0) {
						setError("None of the events could be read. Try rewording it.");
						return;
					}
					setSkippedCount(events.length - parsed.length);
					setExcluded(new Set());
					setSubmittedPrompt(prompt.trim());
					setItems(parsed);
				} catch (parseError) {
					setError(
						`Failed to read prompt: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
					);
				}
			}}
		>
			<div className="space-y-2">
				<Label>Type</Label>
				<ToggleGroup
					variant="outline"
					value={[type]}
					onValueChange={(values) => {
						const value = values[0];
						if (value) setType(value as EventType);
					}}
					className="w-full"
				>
					{EventTypes.map((eventType) => (
						<ToggleGroupItem key={eventType} value={eventType}>
							{EVENT_TYPE_LABELS[eventType]}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
			{afterType}
			<div className="space-y-2">
				<Label htmlFor="events-prompt" className="flex items-center gap-2">
					Describe the events
					{isReadingEventsPrompt && (
						<span className="text-xs font-normal text-muted-foreground">
							Reading…
						</span>
					)}
				</Label>
				<Textarea
					id="events-prompt"
					rows={6}
					placeholder={PLACEHOLDERS[type]}
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
				/>
				<p className="text-sm text-muted-foreground">
					Days are read from{" "}
					{DateTime.fromISO(startDate).toFormat("cccc d LLLL")} onward. You'll
					review the events before anything is created.
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="events-repeat-until">Repeat weekly until</Label>
				<DateInput
					id="events-repeat-until"
					min={startDate}
					value={repeatUntil}
					onChange={(event) => setRepeatUntil(event.target.value)}
				/>
				<p className="text-sm text-muted-foreground">
					Optional. Every event, dated ones included, repeats each week through
					this date. You can also write it in the prompt, like "repeat every
					week until the end of March".
				</p>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
			<div className="flex items-center justify-between gap-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={isReadingEventsPrompt || !prompt.trim()}
				>
					{isReadingEventsPrompt ? "Reading…" : "Preview events"}
				</Button>
			</div>
		</form>
	);
}
