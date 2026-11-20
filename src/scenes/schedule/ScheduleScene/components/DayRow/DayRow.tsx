import { DateTime } from "luxon";
import type React from "react";
import type { ScheduleDay } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";

interface DayRowProps {
	day: ScheduleDay;
	children: React.ReactNode;
}

export const DayRow = ({ day, children }: DayRowProps) => {
	const date = DateTime.fromISO(day.date);
	return (
		<section
			aria-label={date.toFormat("cccc, LLLL d", { locale: "en-US" })}
			className={cn(
				"flex gap-4 border-b py-4 last:border-b-0",
				day.events.length > 0 && "max-md:flex-col max-md:gap-2",
			)}
		>
			<div className="flex w-20 shrink-0 items-center gap-2 md:w-14 md:flex-col md:gap-1">
				<span className="w-8 text-xs font-medium text-muted-foreground uppercase md:w-auto">
					{date.toFormat("ccc", { locale: "en-US" })}
				</span>
				<span
					className={cn(
						"flex size-9 items-center justify-center rounded-full text-lg font-semibold",
						day.isToday && "bg-primary text-primary-foreground",
					)}
				>
					{date.day}
				</span>
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				{day.events.length > 0 ? (
					children
				) : (
					<p className="py-2 text-sm text-muted-foreground">
						Nothing scheduled
					</p>
				)}
			</div>
		</section>
	);
};
