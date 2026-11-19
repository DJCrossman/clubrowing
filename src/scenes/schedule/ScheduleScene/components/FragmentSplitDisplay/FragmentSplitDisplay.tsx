import { formatCompactDuration, formatMeters } from "@/lib/formatters";

interface FragmentSplitDisplayProps {
	fragment: {
		rate?: number | null;
		elapsedTime?: number | null;
		distance?: number | null;
		relativeTo: string;
		relativeSplitMs: number;
	};
}

export const FragmentSplitDisplay = ({
	fragment,
}: FragmentSplitDisplayProps) => {
	const relativeSplitSeconds = fragment.relativeSplitMs / 1000;
	const sign =
		relativeSplitSeconds >= 0 ? "+" : relativeSplitSeconds < 0 ? "−" : "";
	const relativeNotation = `${fragment.relativeTo}${sign}${Math.abs(relativeSplitSeconds)}"`;

	return (
		<div className="space-y-1">
			<FragmentDetails fragment={fragment} />
			<div className="flex items-center justify-between gap-2 font-mono text-sm">
				<span className="whitespace-nowrap">{relativeNotation}</span>
			</div>
		</div>
	);
};

interface FragmentDetailsProps {
	fragment: FragmentSplitDisplayProps["fragment"];
}

const FragmentDetails = ({ fragment }: FragmentDetailsProps) => {
	const rate = fragment.rate == null ? "Open" : `R${fragment.rate}`;

	if (fragment.distance) {
		return (
			<div className="text-sm text-muted-foreground">
				{rate} • {formatMeters(fragment.distance)}
			</div>
		);
	}

	if (fragment.elapsedTime) {
		return (
			<div className="text-sm text-muted-foreground">
				{rate} • {formatCompactDuration(fragment.elapsedTime)}
			</div>
		);
	}

	return <div className="text-sm text-muted-foreground">{rate}</div>;
};
