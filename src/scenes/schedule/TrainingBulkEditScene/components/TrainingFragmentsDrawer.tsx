"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerCloseButton,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Form } from "@/components/ui/form";
import type { CreateWorkoutFragment, EventFormInput } from "@/schemas";
import { FragmentFields } from "../../ScheduleScene/components/FragmentFields/FragmentFields";
import { parseWorkoutDescription } from "../../ScheduleScene/utils/parseWorkoutDescription";
import type { BulkRow } from "../utils/trainingRows";

interface TrainingFragmentsDrawerProps {
	row: BulkRow;
	onSave: (fragments: CreateWorkoutFragment[]) => void;
	onClose: () => void;
}

export const TrainingFragmentsDrawer = ({
	row,
	onSave,
	onClose,
}: TrainingFragmentsDrawerProps) => {
	const [status, setStatus] = useState<
		"untouched" | "read" | "edited" | "failed"
	>("untouched");
	const form = useForm<EventFormInput>({
		defaultValues: {
			workout: { workoutType: row.workoutType, fragments: row.fragments ?? [] },
		},
	});
	const { mutate: readDescription, isPending } = useMutation({
		mutationFn: parseWorkoutDescription,
		onSuccess: (parsed) => {
			form.setValue("workout.fragments", parsed.fragments ?? []);
			setStatus("read");
		},
		onError: () => setStatus("failed"),
	});
	const description = row.description?.trim() ?? "";

	return (
		<Drawer open onOpenChange={(open) => !open && onClose()} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
				<DrawerHeader className="flex flex-row items-center justify-between border-b">
					<div>
						<DrawerTitle>Edit intervals</DrawerTitle>
						{row.title && <DrawerDescription>{row.title}</DrawerDescription>}
					</div>
					<DrawerCloseButton />
				</DrawerHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit((values) =>
							onSave(values.workout.fragments),
						)}
						className="flex-1 space-y-6 overflow-y-auto p-6"
					>
						{description && (
							<div className="space-y-2">
								<p className="text-sm whitespace-pre-line">{description}</p>
								{status === "untouched" && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isPending}
										onClick={() => readDescription(description)}
									>
										Read intervals from the description
									</Button>
								)}
							</div>
						)}
						<FragmentFields
							status={status}
							isReading={isPending}
							onEdit={() => setStatus("edited")}
							onReread={() => readDescription(description)}
						/>
						<div className="flex items-center justify-between gap-4">
							<Button type="button" variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit" disabled={isPending}>
								Save
							</Button>
						</div>
					</form>
				</Form>
			</DrawerContent>
		</Drawer>
	);
};
