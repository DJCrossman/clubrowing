import type { Prisma } from "@/generated/prisma/client";
import type { ViewerContext } from "@/server/domain/common/context";

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
