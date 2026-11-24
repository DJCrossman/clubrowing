import type { ViewerContext } from "@/domain/common/context";
import type { Prisma } from "@/generated/prisma/client";

export function ergsVisibleTo({
	user,
	athlete,
}: Pick<ViewerContext, "user" | "athlete">): Prisma.ergWhereInput {
	if (user.isAdmin) return {};
	if (!athlete) return { ownership: "club" };
	return {
		OR: [{ ownership: "club" }, { ownership: "personal", ownerId: athlete.id }],
	};
}
