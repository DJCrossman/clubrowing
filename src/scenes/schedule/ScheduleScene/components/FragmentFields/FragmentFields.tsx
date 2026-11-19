"use client";

import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventFormInput } from "@/schemas";
import { FragmentEditor } from "../FragmentEditor/FragmentEditor";
import { FragmentSplitDisplay } from "../FragmentSplitDisplay";

interface FragmentFieldsProps {
	status: "untouched" | "read" | "edited" | "failed";
	isReading: boolean;
	onEdit: () => void;
	onReread: () => void;
}

export const FragmentFields = ({
	status,
	isReading,
	onEdit,
	onReread,
}: FragmentFieldsProps) => {
	const labelId = useId();
	const [openIndex, setOpenIndex] = useState<number | null>(null);
	const { control } = useFormContext<EventFormInput>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "workout.fragments",
	});
	const pieces = useWatch({ control, name: "workout.fragments" });

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<h3 id={labelId} className="text-sm font-medium">
					Intervals
				</h3>
				{isReading && (
					<output className="text-xs text-muted-foreground">
						Reading the description…
					</output>
				)}
				{!isReading && status === "read" && (
					<span className="text-xs text-muted-foreground">
						{fields.length > 0
							? "Read from the description"
							: "None found in the description"}
					</span>
				)}
				{!isReading && status === "edited" && (
					<>
						<span className="text-xs text-muted-foreground">
							Edited by hand
						</span>
						<Button
							type="button"
							variant="link"
							size="sm"
							className="h-auto p-0 text-xs"
							onClick={() => {
								setOpenIndex(null);
								onReread();
							}}
						>
							Re-read
						</Button>
					</>
				)}
				{!isReading && status === "failed" && (
					<>
						<span className="text-xs text-destructive">
							Couldn't read the description, so these intervals weren't changed.
						</span>
						<Button
							type="button"
							variant="link"
							size="sm"
							className="h-auto p-0 text-xs"
							onClick={() => {
								setOpenIndex(null);
								onReread();
							}}
						>
							Try again
						</Button>
					</>
				)}
			</div>
			{fields.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No intervals yet. Add them if this session has set intervals.
				</p>
			)}
			{fields.length > 0 && (
				<ol aria-labelledby={labelId} className="divide-y rounded-md border">
					{fields.map((field, index) => (
						<li key={field.id}>
							<button
								type="button"
								aria-expanded={openIndex === index}
								onClick={() => setOpenIndex(openIndex === index ? null : index)}
								className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
							>
								{fields.length > 1 && (
									<span className="w-4 text-sm font-medium tabular-nums text-muted-foreground">
										{index + 1}
									</span>
								)}
								<span className="min-w-0 flex-1">
									<FragmentSplitDisplay fragment={pieces[index] ?? field} />
								</span>
								<IconChevronDown
									aria-hidden
									className={cn(
										"size-4 shrink-0 text-muted-foreground transition-transform",
										openIndex === index && "rotate-180",
									)}
								/>
							</button>
							{openIndex === index && (
								<FragmentEditor
									index={index}
									count={fields.length}
									onEdit={onEdit}
									onRemove={() => {
										remove(index);
										setOpenIndex(null);
										onEdit();
									}}
									onDone={() => setOpenIndex(null)}
								/>
							)}
						</li>
					))}
				</ol>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => {
					append({
						...(pieces.at(-1) ?? { relativeTo: "2K", relativeSplitMs: 0 }),
					});
					setOpenIndex(fields.length);
					onEdit();
				}}
			>
				<IconPlus />
				Add interval
			</Button>
		</div>
	);
};
