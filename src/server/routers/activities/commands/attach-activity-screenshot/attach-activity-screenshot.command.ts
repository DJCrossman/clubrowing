import { TRPCError } from "@trpc/server";
import type { AttachActivityScreenshotInput } from "@/schemas";
import type { ViewerContext } from "@/server/context";

export async function attachActivityScreenshotCommand(
	input: AttachActivityScreenshotInput,
	{ db, user }: Pick<ViewerContext, "db" | "user">,
) {
	const upload = await db.upload.findUnique({
		where: { id: input.uploadId },
		select: { userId: true, activity: { select: { id: true } } },
	});
	if (!upload || upload.userId !== user.id || upload.activity) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "That photo can't be used. Add it again.",
		});
	}
	const { count } = await db.activity.updateMany({
		where: { id: input.id, screenshotId: null },
		data: { screenshotId: input.uploadId },
	});
	if (count === 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "This activity already has a screenshot.",
		});
	}
}
