"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	formatCompactDuration,
	formatCompactSplit,
	formatMeters,
} from "@/lib/formatters";
import { calculateTargetSplit } from "@/lib/formatters/calculateTargetSplit";
import { routes } from "@/lib/routes";
import type { AnalyticMetrics, WorkoutFragment } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";

interface FragmentListProps {
	fragments: WorkoutFragment[];
	analytics: Pick<AnalyticMetrics, "lastTwoKm" | "lastSixKm"> | null;
}

export const FragmentList = ({ fragments, analytics }: FragmentListProps) => {
	const headingId = useId();
	const [isShowingAll, setIsShowingAll] = useState(false);
	const tests = [
		{ name: "2K", distance: 2000, duration: analytics?.lastTwoKm?.duration },
		{ name: "6K", distance: 6000, duration: analytics?.lastSixKm?.duration },
	].filter(({ name }) =>
		fragments.some((fragment) => fragment.relativeTo === name),
	);
	const missingTests = tests.filter(({ duration }) => !duration);
	const hasSplits = missingTests.length < tests.length;

	return (
		<div className="space-y-2">
			<div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
				<h4 id={headingId} className="font-medium">
					Intervals · {fragments.length}
				</h4>
				<span>{hasSplits ? "Your split /500m" : "Target"}</span>
			</div>
			<ol aria-labelledby={headingId} className="divide-y border-y">
				{(fragments.length > 5 && !isShowingAll
					? fragments.slice(0, 4)
					: fragments
				).map((fragment, index) => {
					const test = tests.find(({ name }) => name === fragment.relativeTo);
					const split = test?.duration
						? formatCompactSplit(
								calculateTargetSplit(
									test.duration,
									test.distance,
									fragment.relativeSplitMs,
								),
								500,
							)
						: null;

					return (
						<li
							key={fragment.id}
							className="flex min-h-10 items-center gap-2 text-sm"
						>
							{fragments.length > 1 && (
								<span className="w-4 text-xs tabular-nums text-muted-foreground">
									{index + 1}
								</span>
							)}
							<span className="min-w-0 flex-1 font-medium">
								{[
									fragment.rate == null ? "Open" : `R${fragment.rate}`,
									fragment.distance
										? formatMeters(fragment.distance)
										: fragment.elapsedTime &&
											formatCompactDuration(fragment.elapsedTime),
								]
									.filter(Boolean)
									.join(" • ")}
							</span>
							<span
								className={cn(
									"font-mono",
									hasSplits ? "text-muted-foreground" : "font-semibold",
								)}
							>
								{`${fragment.relativeTo}${fragment.relativeSplitMs < 0 ? "−" : "+"}${Math.abs(fragment.relativeSplitMs) / 1000}"`}
							</span>
							{split && (
								<span className="w-14 text-right font-mono font-semibold">
									{split}
								</span>
							)}
							{hasSplits && !split && (
								<span className="w-14 text-right text-muted-foreground">–</span>
							)}
						</li>
					);
				})}
			</ol>
			{fragments.length > 5 && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-full"
					aria-expanded={isShowingAll}
					onClick={() => setIsShowingAll(!isShowingAll)}
				>
					{isShowingAll
						? "Show fewer"
						: `Show all ${fragments.length} intervals`}
				</Button>
			)}
			{hasSplits && (
				<p className="text-xs text-muted-foreground">
					From your{" "}
					{tests
						.flatMap(({ name, distance, duration }) =>
							duration
								? [`${name} test (${formatCompactSplit(duration, distance)})`]
								: [],
						)
						.join(" and ")}
					.
				</p>
			)}
			{analytics && missingTests.length > 0 && (
				<p className="text-xs text-muted-foreground">
					Log a {missingTests.map(({ name }) => name).join(" or ")} erg test to
					see {hasSplits ? "the rest" : "your own target splits"}.{" "}
					<Link
						href={routes.activities.create()}
						className="font-medium text-foreground hover:underline"
					>
						Add activity
					</Link>
				</p>
			)}
		</div>
	);
};
