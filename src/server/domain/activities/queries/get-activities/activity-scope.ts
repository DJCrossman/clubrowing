import { DomainError } from "@/server/domain/common/domain-error";

export function resolveActivityAthleteIds({
	isAdmin,
	currentAthleteId,
	requestedAthleteIds,
}: {
	isAdmin: boolean;
	currentAthleteId: string | null;
	requestedAthleteIds?: string[];
}): string[] | undefined {
	if (isAdmin) {
		return requestedAthleteIds?.length ? requestedAthleteIds : undefined;
	}
	if (!currentAthleteId) {
		throw new DomainError("FORBIDDEN", "Athlete account required");
	}
	return [currentAthleteId];
}
