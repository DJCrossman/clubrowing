import type { AuthenticatedContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { UpdateActivity } from "@/schemas";
import { updateActivityCommand } from "./update-activity.command";

export async function updateActivityMemberCommand(
	input: UpdateActivity,
	{ db, athlete }: Pick<AuthenticatedContext, "db" | "athlete">,
) {
	const existing = await db.activity.findUnique({
		where: { id: input.id },
		select: { athleteId: true },
	});
	if (!existing) {
		throw new DomainError("NOT_FOUND", "Activity not found");
	}
	if (existing.athleteId !== athlete.id) {
		throw new DomainError(
			"FORBIDDEN",
			"Cannot update another athlete's activity",
		);
	}
	return updateActivityCommand({ ...input, athleteId: athlete.id }, { db });
}
