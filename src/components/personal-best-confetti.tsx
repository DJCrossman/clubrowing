"use client";

import { useCurrentUser } from "@/hooks/useAuth";
import { trpcClient } from "@/lib/trpc/client";

const CONFETTI_COLORS = [
	"bg-red-500",
	"bg-amber-400",
	"bg-emerald-500",
	"bg-sky-500",
	"bg-fuchsia-500",
];

export const PersonalBestConfetti = () => {
	const { user, hasAthlete } = useCurrentUser();
	const statsQuery = trpcClient.athletes.getAthleteStats.useQuery(
		{ athleteId: user.id },
		{ enabled: hasAthlete },
	);

	if (!statsQuery.data?.isCelebratingPersonalBest) {
		return null;
	}

	return (
		<div
			aria-hidden="true"
			data-slot="personal-best-confetti"
			className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden"
		>
			{Array.from({ length: 36 }, (_, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
					key={index}
					className={`absolute top-0 block h-3 w-1.5 animate-confetti-fall rounded-[1px] ${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}`}
					style={{
						left: `${(index * 37) % 100}%`,
						animationDuration: `${4 + (index % 5)}s`,
						animationDelay: `${-((index * 7) % 60) / 10}s`,
					}}
				/>
			))}
		</div>
	);
};
