import type { DeleteActivityInput } from "@/schemas";
import type { AuthenticatedContext } from "@/server/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { deleteActivityCommand } from "./delete-activity.command";

export async function deleteActivityMemberCommand(
	input: DeleteActivityInput,
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
			"Cannot delete another athlete's activity",
		);
	}
	return deleteActivityCommand(input, { db });
}
