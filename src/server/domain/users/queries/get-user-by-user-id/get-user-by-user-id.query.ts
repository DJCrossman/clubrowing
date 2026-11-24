import type { Context } from "@/domain/common/context";
import { mapToUserDto } from "@/domain/users/common/map-to-user-dto";
import type { GetUserByUserIdInput } from "@/schemas";

export async function getUserByUserIdQuery(
	input: GetUserByUserIdInput,
	{ db }: Context,
) {
	const user = await db.athlete.findUnique({
		where: { userId: input.userId },
	});
	return user ? mapToUserDto(user) : null;
}
