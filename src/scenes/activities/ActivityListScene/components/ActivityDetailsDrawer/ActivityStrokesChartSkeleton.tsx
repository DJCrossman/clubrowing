import { SectionLabel } from "@/components/drawer-details";
import { Skeleton } from "@/components/ui/skeleton";

export const ActivityStrokesChartSkeleton = () => (
	<div className="space-y-3">
		<SectionLabel action={<Skeleton className="h-8 w-44" />}>
			Stroke data
		</SectionLabel>
		<Skeleton className="h-[180px] w-full" />
	</div>
);
