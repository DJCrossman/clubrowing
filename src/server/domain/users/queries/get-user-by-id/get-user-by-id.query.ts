import type { Context } from "@/domain/common/context";
import { mapToUserDto } from "@/domain/users/common/map-to-user-dto";
import type { GetUserByIdInput } from "@/schemas";

export async function getUserByIdQuery(
	input: GetUserByIdInput,
	{ db }: Context,
) {
	const user = await db.athlete.findUnique({ where: { id: input.id } });
	if (!user) {
		throw new Error("User not found");
	}
	return mapToUserDto(user);
}
