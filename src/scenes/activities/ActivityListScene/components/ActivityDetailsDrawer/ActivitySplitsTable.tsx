import { Fragment } from "react";
import { SectionLabel } from "@/components/drawer-details";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatCompactDuration,
	formatCompactSplit,
	formatMeters,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Concept2Activity } from "@/schemas";

interface ActivitySplitsTableProps {
	workout: NonNullable<Concept2Activity["workout"]>;
}

// Concept2 times are in tenths of a second.
export const ActivitySplitsTable = ({ workout }: ActivitySplitsTableProps) => {
	const splits = workout.splits ?? [];
	const rows = workout.intervals?.length
		? workout.intervals.map((interval) => ({
				shownDistance: interval.distance,
				shownTime: interval.time,
				distance: interval.distance,
				time: interval.time,
				strokeRate: interval.stroke_rate,
				heartRate: interval.heart_rate?.average ?? 0,
				restTime: interval.rest_time ?? 0,
			}))
		: splits.map((split, index) => ({
				shownDistance: splits
					.slice(0, index + 1)
					.reduce((total, part) => total + (part.distance ?? 0), 0),
				shownTime: splits
					.slice(0, index + 1)
					.reduce((total, part) => total + (part.time ?? 0), 0),
				distance: split.distance ?? 0,
				time: split.time ?? 0,
				strokeRate: split.stroke_rate,
				heartRate: split.heart_rate?.average ?? 0,
				restTime: 0,
			}));

	if (rows.length === 0) {
		return null;
	}

	const hasHeartRate = rows.some((row) => row.heartRate > 0);

	return (
		<div className="space-y-3">
			<SectionLabel>
				{workout.intervals?.length ? "Intervals" : "Splits"}
			</SectionLabel>
			<Table className="text-[15px] tabular-nums">
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead className="h-8 pl-0 text-xs font-semibold text-muted-foreground">
							Distance
						</TableHead>
						<TableHead className="h-8 text-xs font-semibold text-muted-foreground">
							Time
						</TableHead>
						<TableHead className="h-8 text-xs font-semibold text-muted-foreground">
							/500m
						</TableHead>
						<TableHead className="h-8 text-right text-xs font-semibold text-muted-foreground last:pr-0">
							Rate
						</TableHead>
						{hasHeartRate && (
							<TableHead className="h-8 pr-0 text-right text-xs font-semibold text-muted-foreground">
								HR
							</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a result's parts never reorder
						<Fragment key={index}>
							<TableRow
								className={cn(
									"hover:bg-transparent",
									row.restTime > 0 && "border-b-0",
								)}
							>
								<TableCell className="h-10 pl-0">
									{formatMeters(row.shownDistance)}
								</TableCell>
								<TableCell className="h-10">
									{formatCompactDuration(row.shownTime * 100)}
								</TableCell>
								<TableCell className="h-10 font-semibold">
									{row.distance > 0 &&
										formatCompactSplit(row.time * 100, row.distance)}
								</TableCell>
								<TableCell className="h-10 text-right last:pr-0">
									{row.strokeRate}
								</TableCell>
								{hasHeartRate && (
									<TableCell className="h-10 pr-0 text-right">
										{row.heartRate > 0 && row.heartRate}
									</TableCell>
								)}
							</TableRow>
							{row.restTime > 0 && (
								<TableRow className="hover:bg-transparent">
									<TableCell
										colSpan={hasHeartRate ? 5 : 4}
										className="pt-0 pl-0 text-xs text-muted-foreground"
									>
										Rest {formatCompactDuration(row.restTime * 100)}
									</TableCell>
								</TableRow>
							)}
						</Fragment>
					))}
				</TableBody>
			</Table>
		</div>
	);
};
