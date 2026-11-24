import type { AttachActivityScreenshotInput } from "@/schemas";
import type { ViewerContext } from "@/server/context";
import { DomainError } from "@/server/domain/common/domain-error";

export async function attachActivityScreenshotCommand(
	input: AttachActivityScreenshotInput,
	{ db, user }: Pick<ViewerContext, "db" | "user">,
) {
	const upload = await db.upload.findUnique({
		where: { id: input.uploadId },
		select: {
			userId: true,
			name: true,
			messageId: true,
			previewOfId: true,
			contentType: true,
			pending: true,
			activity: { select: { id: true } },
		},
	});
	if (
		!upload ||
		upload.userId !== user.id ||
		upload.name ||
		upload.activity ||
		upload.messageId ||
		upload.previewOfId ||
		upload.contentType ||
		upload.pending
	) {
		throw new DomainError(
			"BAD_REQUEST",
			"That photo can't be used. Add it again.",
		);
	}
	const { count } = await db.activity.updateMany({
		where: { id: input.id, screenshotId: null },
		data: { screenshotId: input.uploadId },
	});
	if (count === 0) {
		throw new DomainError(
			"CONFLICT",
			"This activity already has a screenshot.",
		);
	}
}
