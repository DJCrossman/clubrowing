import { createLogger } from "@/lib/logger";
import type { DeleteMessage } from "@/schemas/chat.schema";
import {
	findAccessibleMessage,
	isChatAdmin,
} from "@/server/domain/chat/common/chat-access";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { removeUploads } from "@/server/domain/common/remove-uploads";

const logger = createLogger("chat.delete-message");

export async function deleteMessageCommand(
	input: DeleteMessage,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const message = await findAccessibleMessage(db, input.messageId, user);
	if (message.authorUserId !== user.id && !isChatAdmin(ctx)) {
		throw new DomainError("FORBIDDEN", "You can only delete your own messages");
	}
	if (!message.deletedAt) {
		await db.message.update({
			where: { id: message.id },
			data: { deletedAt: new Date() },
		});
	}
	// A later cleanup retries photos left behind, so this never fails the delete.
	try {
		await removeUploads({
			db,
			uploads: await db.upload.findMany({
				where: { messageId: message.id },
				select: { id: true, url: true },
			}),
		});
	} catch (error) {
		logger.error("chat message photo removal failed", {
			messageId: message.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return {
		messageId: message.id,
		channelId: message.channelId,
		parentId: message.parentId,
	};
}
