import { TRPCError } from "@trpc/server";
import type { MarkErg } from "@/schemas";
import type { ViewerContext } from "@/server/context";

export async function markErgCommand(
	input: MarkErg,
	{ db, athlete }: ViewerContext,
): Promise<boolean> {
	if (!athlete) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Athlete account required",
		});
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
		throw new TRPCError({ code: "NOT_FOUND", message: "Erg not found" });
	}
	return true;
}
