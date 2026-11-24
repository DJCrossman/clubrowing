import type { AuthenticatedContext } from "@/domain/common/context";
import type { UnsubscribeFromPush } from "@/schemas";

export async function unsubscribeCommand(
	input: UnsubscribeFromPush,
	{ db, athlete }: AuthenticatedContext,
) {
	const { count } = await db.push_subscription.deleteMany({
		where: { endpoint: input.endpoint, athleteId: athlete.id },
	});

	return { removed: count };
}
