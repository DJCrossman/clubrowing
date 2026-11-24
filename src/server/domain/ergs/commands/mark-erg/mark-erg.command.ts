import type { ViewerContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { MarkErg } from "@/schemas";

export async function markErgCommand(
	input: MarkErg,
	{ db, athlete }: ViewerContext,
): Promise<boolean> {
	if (!athlete) {
		throw new DomainError("FORBIDDEN", "Athlete account required");
	}

	// One conditional write, so two people marking the same erg can't both win.
	const { count } = await db.erg.updateMany({
		where: {
			id: input.id,
			ownership: "club",
			activities: { some: { athleteId: athlete.id } },
		},
		data: { ownership: "personal", ownerId: athlete.id },
	});
	if (count === 0) {
		throw new DomainError("NOT_FOUND", "Erg not found");
	}
	return true;
}
