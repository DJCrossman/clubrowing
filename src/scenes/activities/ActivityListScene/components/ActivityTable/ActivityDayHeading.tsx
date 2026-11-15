import { DateTime } from "luxon";

export function ActivityDayHeading({ day }: { day: string }) {
	return (
		<h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
			{dayLabel(DateTime.fromISO(day), DateTime.now())}
		</h2>
	);
}

function dayLabel(date: DateTime, now: DateTime) {
	if (date.hasSame(now, "day")) return "Today";
	if (date.hasSame(now.minus({ days: 1 }), "day")) return "Yesterday";
	if (date.hasSame(now, "year")) return date.toFormat("ccc LLL d");
	return date.toFormat("ccc LLL d, yyyy");
}
