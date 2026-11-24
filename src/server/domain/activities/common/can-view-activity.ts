import type { ViewerContext } from "@/domain/common/context";

export function canViewActivity({
	activity,
	user,
	athlete,
}: Pick<ViewerContext, "user" | "athlete"> & {
	activity: { athleteId: string; isHidden: boolean };
}) {
	if (activity.athleteId === athlete?.id) return true;
	return user.isAdmin && !activity.isHidden;
}
