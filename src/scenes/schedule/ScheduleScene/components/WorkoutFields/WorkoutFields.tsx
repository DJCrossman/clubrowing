"use client";

import { IconLoader2 } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ParseDescriptionResult } from "@/app/api/v1/workouts/parse-description/route";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
	type EventFormInput,
	type IntensityCategory,
	type WorkoutActivityType,
	WorkoutActivityTypes,
} from "@/schemas";
import {
	intensityActiveSelectorMap,
	intensityColorMap,
} from "../../utils/intensityColorMap";
import { FragmentFields } from "../FragmentFields/FragmentFields";

export type ReadWorkoutDescription = (
	description: string,
) => Promise<ParseDescriptionResult>;

const INTENSITY_VALUES: IntensityCategory[] = [
	"C1",
	"C2",
	"C3",
	"C4",
	"C5",
	"C6",
];

interface WorkoutFieldsProps {
	isReadingWorkoutDescription: boolean;
	onReadWorkoutDescription: ReadWorkoutDescription;
}

export const WorkoutFields = ({
	isReadingWorkoutDescription,
	onReadWorkoutDescription,
}: WorkoutFieldsProps) => {
	const [status, setStatus] = useState<
		"untouched" | "read" | "edited" | "failed"
	>("untouched");
	const { control, watch, setValue, getValues } =
		useFormContext<EventFormInput>();
	const lastReadDescription = useRef(getValues("workout.description").trim());
	const workoutType = watch("workout.workoutType");
	const readDescription = async (description: string) => {
		try {
			const parsed = await onReadWorkoutDescription(description);
			setValue("workout.workoutType", parsed.workoutType, {
				shouldValidate: true,
			});
			setValue("workout.elapsedTime", parsed.elapsedTime ?? null);
			setValue("workout.distance", parsed.distance ?? null);
			setValue("workout.intervalCount", parsed.intervalCount ?? 1);
			setValue("workout.fragments", parsed.fragments ?? []);
			lastReadDescription.current = description;
			setStatus("read");
		} catch {
			setStatus("failed");
		}
	};

	return (
		<>
			<FormField
				control={control}
				name="workout.activityType"
				render={({ field }) => (
					<FormItem>
						<FormLabel isRequired>Activity type</FormLabel>
						<FormControl>
							<Tabs
								value={field.value}
								onValueChange={(value) => {
									if (
										WorkoutActivityTypes.includes(value as WorkoutActivityType)
									)
										field.onChange(value);
								}}
							>
								<TabsList className="grid w-full grid-cols-4">
									<TabsTrigger value="water">Boat</TabsTrigger>
									<TabsTrigger value="erg">ERG</TabsTrigger>
									<TabsTrigger value="crossTrain">XT</TabsTrigger>
									<TabsTrigger value="strength">S&C</TabsTrigger>
								</TabsList>
							</Tabs>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={control}
				name="workout.description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							Workout
							{isReadingWorkoutDescription && (
								<span className="flex items-center gap-1 text-xs leading-none font-normal text-muted-foreground">
									<IconLoader2 aria-hidden className="size-3 animate-spin" />
									Reading…
								</span>
							)}
						</FormLabel>
						<FormControl>
							<Textarea
								placeholder="3 × 20′ / 3′ rest @ R20"
								{...field}
								onBlur={(event) => {
									field.onBlur();
									const description = event.target.value.trim();
									if (
										description &&
										description !== lastReadDescription.current &&
										status !== "edited"
									)
										readDescription(description);
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FragmentFields
				status={status}
				isReading={isReadingWorkoutDescription}
				onEdit={() => setStatus("edited")}
				onReread={() =>
					readDescription(getValues("workout.description").trim())
				}
			/>
			<FormField
				control={control}
				name="workout.intensityCategory"
				render={({ field }) => (
					<FormItem>
						<FormLabel isRequired>Intensity</FormLabel>
						<FormControl>
							<ToggleGroup
								value={field.value ? [field.value] : []}
								onValueChange={(values) => {
									const value = values[0];
									if (value) field.onChange(value);
								}}
								className="w-full"
							>
								{INTENSITY_VALUES.map((category) => (
									<ToggleGroupItem
										key={category}
										value={category}
										aria-label={`Intensity ${category}`}
										className={cn(
											intensityColorMap[category],
											intensityActiveSelectorMap[category],
											"data-pressed:ring-2 data-pressed:ring-primary",
										)}
									>
										{category}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={control}
				name="workout.workoutType"
				render={({ field }) => (
					<FormItem>
						<FormLabel isRequired>Workout type</FormLabel>
						<FormControl>
							<ToggleGroup
								variant="outline"
								value={field.value ? [field.value] : []}
								onValueChange={(values) => {
									const value = values[0];
									if (value) field.onChange(value);
								}}
								className="w-full"
							>
								<ToggleGroupItem value="time">Time</ToggleGroupItem>
								<ToggleGroupItem value="distance">Distance</ToggleGroupItem>
								<ToggleGroupItem value="other">Other</ToggleGroupItem>
							</ToggleGroup>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={control}
				name="workout.distance"
				render={({ field }) => (
					<FormItem hidden={workoutType !== "distance"}>
						<FormLabel isRequired>Distance (m)</FormLabel>
						<FormControl>
							<Input
								type="number"
								min={0}
								step={1}
								placeholder="e.g. 5000"
								value={field.value ?? ""}
								onChange={(event) =>
									field.onChange(
										event.target.value === ""
											? null
											: Number(event.target.value),
									)
								}
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
				name="workout.elapsedTime"
				render={({ field }) => (
					<FormItem hidden={workoutType !== "time"}>
						<FormLabel isRequired>Elapsed time (min)</FormLabel>
						<FormControl>
							<Input
								type="number"
								min={0}
								step={1}
								placeholder="e.g. 60"
								value={
									field.value === null ? "" : Math.round(field.value / 60_000)
								}
								onChange={(event) =>
									field.onChange(
										event.target.value === ""
											? null
											: Number(event.target.value) * 60_000,
									)
								}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
};
