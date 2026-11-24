import type { AuthenticatedContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import type { DeleteActivityInput } from "@/schemas";
import { deleteActivityCommand } from "./delete-activity.command";

export async function deleteActivityMemberCommand(
	input: DeleteActivityInput,
	{
		db,
		athlete,
		services,
	}: Pick<AuthenticatedContext, "db" | "athlete" | "services">,
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
	return deleteActivityCommand(input, { db, services });
}
