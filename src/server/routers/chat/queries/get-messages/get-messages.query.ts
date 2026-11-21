import { createLogger } from "@/lib/logger";
import type { GetMessagesInput } from "@/schemas/chat.schema";
import { findVideosPausedUntil } from "@/server/common/videos-paused-until";
import type { ViewerContext } from "@/server/context";
import {
	findAccessibleChannel,
	getVisibleFrom,
} from "@/server/routers/chat/common/chat-access";
import { loadMessageDtos } from "@/server/routers/chat/common/load-message-dtos";
import { messageInclude } from "@/server/routers/chat/common/map-to-message-dto";

const logger = createLogger("chat.get-messages");

export async function getMessagesQuery(
	input: GetMessagesInput,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const channel = await findAccessibleChannel(db, input.channelId, user);
	const visibleFrom = getVisibleFrom(channel, user.id);
	const [rows, read] = await Promise.all([
		db.message.findMany({
			where: {
				channelId: input.channelId,
				parentId: null,
				...(visibleFrom ? { createdAt: { gte: visibleFrom } } : {}),
				OR: [{ deletedAt: null }, { replies: { some: { deletedAt: null } } }],
			},
			include: messageInclude,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: input.limit + 1,
			...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		}),
		db.channel_read.findUnique({
			where: {
				channelId_userId: { channelId: input.channelId, userId: user.id },
			},
			select: { lastReadAt: true },
		}),
	]);
	const page = rows.slice(0, input.limit);
	// The largest video on the page, so the page never offers a play that will be refused.
	const largestVideoSize = Math.max(
		0,
		...page.flatMap((message) =>
			message.attachments.flatMap(({ size, contentType }) =>
				contentType === null ? [] : [size],
			),
		),
	);
	// Display only: the play route enforces the allowance itself, so a failed lookup must not fail the page.
	const videosPausedUntil =
		largestVideoSize > 0
			? await findVideosPausedUntil({ db, size: largestVideoSize }).catch(
					(error) => {
						logger.error("video allowance lookup failed", {
							channelId: input.channelId,
							error: error instanceof Error ? error.message : String(error),
						});
						return null;
					},
				)
			: null;

	return {
		data: await loadMessageDtos(ctx, page),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
		lastReadAt: read?.lastReadAt.toISOString() ?? null,
		videosPausedUntil: videosPausedUntil?.toISOString() ?? null,
	};
}
