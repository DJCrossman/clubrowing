"use client";

import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { EventFormInput } from "@/schemas";

interface FragmentEditorProps {
	index: number;
	count: number;
	onEdit: () => void;
	onRemove: () => void;
	onDone: () => void;
}

export const FragmentEditor = ({
	index,
	count,
	onEdit,
	onRemove,
	onDone,
}: FragmentEditorProps) => {
	const { control, setValue } = useFormContext<EventFormInput>();
	const [elapsedTime, distance, relativeTo, relativeSplitMs, workoutType] =
		useWatch({
			control,
			name: [
				`workout.fragments.${index}.elapsedTime`,
				`workout.fragments.${index}.distance`,
				`workout.fragments.${index}.relativeTo`,
				`workout.fragments.${index}.relativeSplitMs`,
				"workout.workoutType",
			],
		});
	const isTimed =
		typeof elapsedTime === "number" ||
		(typeof distance !== "number" && workoutType === "time");
	const measuredBy = isTimed ? "time" : "distance";

	return (
		<div className="space-y-4 border-t bg-muted/30 p-3">
			<div className="grid gap-2">
				<p className="text-sm font-medium">Measured by</p>
				<ToggleGroup
					variant="outline"
					aria-label="Measured by"
					value={[measuredBy]}
					onValueChange={(values) => {
						const value = values[0];
						if (!value) return;
						setValue(
							`workout.fragments.${index}.elapsedTime`,
							value === "time" ? 0 : undefined,
							{ shouldDirty: true },
						);
						setValue(
							`workout.fragments.${index}.distance`,
							value === "distance" ? 0 : undefined,
							{ shouldDirty: true },
						);
						onEdit();
					}}
					className="w-full"
				>
					<ToggleGroupItem value="distance">Distance</ToggleGroupItem>
					<ToggleGroupItem value="time">Time</ToggleGroupItem>
				</ToggleGroup>
			</div>
			<div className="grid grid-cols-2 gap-3">
				{measuredBy === "distance" && (
					<FormField
						control={control}
						name={`workout.fragments.${index}.distance`}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Distance (m)</FormLabel>
								<FormControl>
									<Input
										type="number"
										min={0}
										step={1}
										placeholder="e.g. 1000"
										value={field.value || ""}
										onChange={(event) => {
											field.onChange(Math.round(Number(event.target.value)));
											onEdit();
										}}
										onBlur={field.onBlur}
										name={field.name}
										ref={field.ref}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				{measuredBy === "time" && (
					<>
						<FormField
							control={control}
							name={`workout.fragments.${index}.elapsedTime`}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Minutes</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											step={1}
											placeholder="0"
											value={
												field.value ? Math.floor(field.value / 60_000) : ""
											}
											onChange={(event) => {
												field.onChange(
													Math.round(Number(event.target.value)) * 60_000 +
														((field.value ?? 0) % 60_000),
												);
												onEdit();
											}}
											onBlur={field.onBlur}
											name={field.name}
											ref={field.ref}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={control}
							name={`workout.fragments.${index}.elapsedTime`}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Seconds</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											max={59}
											step={1}
											placeholder="0"
											value={
												field.value
													? Math.round((field.value % 60_000) / 1000)
													: ""
											}
											onChange={(event) => {
												field.onChange(
													Math.floor((field.value ?? 0) / 60_000) * 60_000 +
														Math.round(Number(event.target.value)) * 1000,
												);
												onEdit();
											}}
											onBlur={field.onBlur}
											name={field.name}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				)}
				<FormField
					control={control}
					name={`workout.fragments.${index}.rate`}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Rate (spm)</FormLabel>
							<FormControl>
								<Input
									type="number"
									min={0}
									step={1}
									placeholder="Open"
									value={field.value ?? ""}
									onChange={(event) => {
										field.onChange(
											event.target.value === ""
												? undefined
												: Math.round(Number(event.target.value)),
										);
										onEdit();
									}}
									onBlur={field.onBlur}
									name={field.name}
									ref={field.ref}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
			<FormField
				control={control}
				name={`workout.fragments.${index}.relativeTo`}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Split against</FormLabel>
						<FormControl>
							<ToggleGroup
								variant="outline"
								aria-label="Split against"
								value={[field.value]}
								onValueChange={(values) => {
									const value = values[0];
									if (!value) return;
									field.onChange(value);
									onEdit();
								}}
								className="w-full"
							>
								<ToggleGroupItem value="2K">2K</ToggleGroupItem>
								<ToggleGroupItem value="6K">6K</ToggleGroupItem>
							</ToggleGroup>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<div className="grid gap-2">
				<p className="text-sm font-medium">Split per 500 m</p>
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="One second faster"
						onClick={() => {
							setValue(
								`workout.fragments.${index}.relativeSplitMs`,
								relativeSplitMs - 1000,
								{ shouldDirty: true },
							);
							onEdit();
						}}
					>
						<IconMinus />
					</Button>
					<span aria-live="polite" className="flex-1 text-center text-sm">
						{relativeSplitMs === 0 && `${relativeTo} pace`}
						{relativeSplitMs > 0 &&
							`${relativeSplitMs / 1000}" slower than ${relativeTo} pace`}
						{relativeSplitMs < 0 &&
							`${-relativeSplitMs / 1000}" faster than ${relativeTo} pace`}
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="One second slower"
						onClick={() => {
							setValue(
								`workout.fragments.${index}.relativeSplitMs`,
								relativeSplitMs + 1000,
								{ shouldDirty: true },
							);
							onEdit();
						}}
					>
						<IconPlus />
					</Button>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-destructive"
					onClick={onRemove}
				>
					Remove
				</Button>
				{count > 1 && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							for (let piece = 0; piece < count; piece++) {
								setValue(`workout.fragments.${piece}.relativeTo`, relativeTo, {
									shouldDirty: true,
								});
								setValue(
									`workout.fragments.${piece}.relativeSplitMs`,
									relativeSplitMs,
									{ shouldDirty: true },
								);
							}
							onEdit();
						}}
					>
						Same split for all
					</Button>
				)}
				<Button type="button" size="sm" className="ml-auto" onClick={onDone}>
					Done
				</Button>
			</div>
		</div>
	);
};
