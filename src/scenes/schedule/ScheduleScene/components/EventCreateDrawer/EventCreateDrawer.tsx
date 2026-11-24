"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerCloseButton,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import type { CreateEvent, EventFormInput } from "@/schemas";
import { getNewEventFormValues } from "../../utils/getEventFormValues";
import { EventCreateForm } from "../EventCreateForm/EventCreateForm";
import {
	EventPromptForm,
	type ReadEventsPrompt,
} from "../EventPromptForm/EventPromptForm";

interface EventCreateDrawerProps {
	isOpen: boolean;
	defaultDate: string;
	defaultValues?: EventFormInput;
	isReadingEventsPrompt?: boolean;
	onReadEventsPrompt?: ReadEventsPrompt;
	onClose: () => void;
	onSubmit: (input: CreateEvent) => Promise<void>;
	onSubmitMany?: (inputs: CreateEvent[]) => Promise<void>;
}

export const EventCreateDrawer = ({
	isOpen,
	defaultDate,
	defaultValues,
	isReadingEventsPrompt,
	onReadEventsPrompt,
	onClose,
	onSubmit,
	onSubmitMany,
}: EventCreateDrawerProps) => (
	<Drawer
		open={isOpen}
		onOpenChange={(open) => !open && onClose()}
		direction="right"
	>
		<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
			<DrawerHeader className="flex flex-row items-center justify-between border-b">
				<div>
					<DrawerTitle>New event</DrawerTitle>
					<DrawerDescription>
						Add a training, regatta, volunteer shift or social
					</DrawerDescription>
				</div>
				<DrawerCloseButton />
			</DrawerHeader>
			<div className="flex-1 overflow-y-auto p-6">
				{isOpen && (
					<EventCreateBody
						defaultDate={defaultDate}
						defaultValues={defaultValues}
						isReadingEventsPrompt={isReadingEventsPrompt}
						onReadEventsPrompt={onReadEventsPrompt}
						onClose={onClose}
						onSubmit={onSubmit}
						onSubmitMany={onSubmitMany}
					/>
				)}
			</div>
		</DrawerContent>
	</Drawer>
);

// Mounted only while the drawer is open, so each opening starts on the
// single-event form.
const EventCreateBody = ({
	defaultDate,
	defaultValues,
	isReadingEventsPrompt = false,
	onReadEventsPrompt,
	onClose,
	onSubmit,
	onSubmitMany,
}: Omit<EventCreateDrawerProps, "isOpen">) => {
	const [mode, setMode] = useState<"form" | "prompt">("form");

	return mode === "prompt" && onSubmitMany && onReadEventsPrompt ? (
		<EventPromptForm
			startDate={defaultDate}
			afterType={
				<Button
					type="button"
					variant="link"
					className="h-auto p-0"
					onClick={() => setMode("form")}
				>
					Add a single event instead
				</Button>
			}
			isReadingEventsPrompt={isReadingEventsPrompt}
			onReadEventsPrompt={onReadEventsPrompt}
			onSubmit={onSubmitMany}
			onCancel={onClose}
		/>
	) : (
		<EventCreateForm
			defaultValues={defaultValues ?? getNewEventFormValues(defaultDate)}
			afterType={
				onSubmitMany &&
				onReadEventsPrompt && (
					<Button
						type="button"
						variant="link"
						className="h-auto p-0"
						onClick={() => setMode("prompt")}
					>
						<IconSparkles />
						Create several events from a prompt
					</Button>
				)
			}
			onSubmit={onSubmit}
			onCancel={onClose}
		/>
	);
};
