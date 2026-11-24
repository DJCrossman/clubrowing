import type { UpdateActivity } from "@/schemas";
import type { AuthenticatedContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
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
