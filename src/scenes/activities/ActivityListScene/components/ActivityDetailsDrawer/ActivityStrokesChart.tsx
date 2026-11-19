import { useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import { SectionLabel } from "@/components/drawer-details";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCompactSplit, formatMeters } from "@/lib/formatters";
import type { Concept2Activity, Concept2Strokes } from "@/schemas";

const chartConfig = {
	pace: {
		label: "Pace",
		color: "var(--primary)",
	},
	rate: {
		label: "Rate",
		color: "var(--primary)",
	},
	heartRate: {
		label: "Heart rate",
		color: "var(--primary)",
	},
} satisfies ChartConfig;

const METRICS = ["pace", "rate", "heartRate"] as const;

interface ActivityStrokesChartProps {
	strokes: Concept2Strokes;
	workout?: Concept2Activity["workout"];
}

export const ActivityStrokesChart = ({
	strokes,
	workout,
}: ActivityStrokesChartProps) => {
	const [metric, setMetric] = useState<(typeof METRICS)[number]>("pace");

	// Concept2 restarts `t` and `d` (tenths of a second and of a metre) at each
	// interval, and follows an interval's work strokes with the strokes rowed
	// during its rest, which run past the interval's own time.
	const points: {
		distance: number;
		pace: number;
		rate: number | null;
		heartRate: number | null;
	}[] = [];
	const intervalStarts: number[] = [];
	let segment = 0;
	let offset = 0;
	// The first strokes off a standing flywheel read far slower than the rest
	// and would flatten the pace line, so they do not set its scale.
	let strokesSinceStart = 0;
	let slowestSettledPace = 0;
	strokes.forEach((stroke, index) => {
		const previous = strokes[index - 1];
		if (previous && stroke.t < previous.t) {
			offset += workout?.intervals?.[segment]?.distance ?? previous.d / 10;
			segment += 1;
			intervalStarts.push(offset);
			strokesSinceStart = 0;
		}
		const intervalTime = workout?.intervals?.[segment]?.time;
		if (intervalTime !== undefined && stroke.t > intervalTime) {
			return;
		}
		strokesSinceStart += 1;
		if (strokesSinceStart > 3) {
			slowestSettledPace = Math.max(slowestSettledPace, stroke.p);
		}
		points.push({
			distance: offset + stroke.d / 10,
			pace: stroke.p,
			rate: stroke.spm || null,
			heartRate: stroke.hr || null,
		});
	});

	const hasHeartRate = points.some((point) => point.heartRate !== null);

	return (
		<div className="space-y-3">
			<SectionLabel
				action={
					<ToggleGroup
						value={[metric]}
						onValueChange={(values) => {
							const value = values[0];
							if (value) setMetric(value);
						}}
						variant="outline"
						size="sm"
						aria-label="Stroke metric"
					>
						{METRICS.filter(
							(value) => value !== "heartRate" || hasHeartRate,
						).map((value) => (
							<ToggleGroupItem
								key={value}
								value={value}
								className="flex-none px-2.5"
							>
								{chartConfig[value].label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				}
			>
				Stroke data
			</SectionLabel>
			<ChartContainer
				config={chartConfig}
				className="aspect-auto h-[180px] w-full"
			>
				<LineChart data={points} margin={{ left: 0, right: 8 }}>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="distance"
						type="number"
						domain={[0, points.at(-1)?.distance ?? 0]}
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={24}
						tickFormatter={(value: number) => formatMeters(value)}
					/>
					<YAxis
						domain={
							metric === "pace" && slowestSettledPace
								? [
										(fastestPace: number) => Math.floor(fastestPace / 10) * 10,
										Math.ceil(slowestSettledPace / 10) * 10,
									]
								: ["dataMin", "dataMax"]
						}
						allowDataOverflow
						reversed={metric === "pace"}
						allowDecimals={false}
						tickLine={false}
						axisLine={false}
						width={48}
						tickFormatter={(value: number) =>
							metric === "pace"
								? formatCompactSplit(value * 100, 500)
								: String(Math.round(value))
						}
					/>
					{intervalStarts.map((distance) => (
						<ReferenceLine
							key={distance}
							x={distance}
							stroke="var(--border)"
							strokeDasharray="4 4"
						/>
					))}
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								labelFormatter={(_, payload) =>
									formatMeters(payload[0]?.payload.distance ?? 0)
								}
								formatter={(value) => (
									<div className="flex flex-1 items-center justify-between gap-2 leading-none">
										<span className="text-muted-foreground">
											{chartConfig[metric].label}
										</span>
										<span className="font-mono font-medium text-foreground tabular-nums">
											{metric === "pace" &&
												formatCompactSplit(Number(value) * 100, 500)}
											{metric === "rate" && `${value} spm`}
											{metric === "heartRate" && `${value} bpm`}
										</span>
									</div>
								)}
							/>
						}
					/>
					<Line
						dataKey={metric}
						stroke={`var(--color-${metric})`}
						strokeWidth={1.5}
						dot={false}
						isAnimationActive={false}
					/>
				</LineChart>
			</ChartContainer>
		</div>
	);
};
