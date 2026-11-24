import { head } from "@vercel/blob";
import { Prisma } from "@/generated/prisma/client";
import type { SendMessage } from "@/schemas/chat.schema";
import { findAccessibleChannel } from "@/server/domain/chat/common/chat-access";
import { loadMessageDtos } from "@/server/domain/chat/common/load-message-dtos";
import { messageInclude } from "@/server/domain/chat/common/map-to-message-dto";
import { selectChannelMentions } from "@/server/domain/chat/common/message-mentions";
import { notifyChannelAfterResponse } from "@/server/domain/chat/common/message-notifications";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { storedFileMatches } from "@/server/domain/common/stored-file-matches";

export async function sendMessageCommand(
	input: SendMessage,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	const channel = await findAccessibleChannel(db, input.channelId, user);
	if (input.quotedMessageId) {
		await assertQuotable(ctx, input.quotedMessageId, input.channelId);
	}
	await confirmPendingUploads({ db, user, attachmentIds: input.attachmentIds });
	const message = await db.message
		.create({
			data: {
				channelId: input.channelId,
				authorUserId: user.id,
				text: input.text || null,
				gif: input.gif?.title ?? null,
				gifId: input.gif?.id ?? null,
				quotedMessageId: input.quotedMessageId ?? null,
				mentions: {
					create: await selectChannelMentions({
						db,
						channel,
						authorUserId: user.id,
						mentions: input.mentions ?? [],
					}),
				},
				// Only the sender's own uploads that no message or activity holds yet, so a
				// double send can't attach the same file twice.
				attachments: {
					connect: input.attachmentIds?.map((id) => ({
						id,
						userId: user.id,
						messageId: null,
						activity: null,
						previewOf: null,
						pending: false,
					})),
				},
			},
			include: messageInclude,
		})
		.catch((error) => {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2018"
			) {
				throw new DomainError(
					"BAD_REQUEST",
					"Those files can't be added. Try adding them again.",
				);
			}
			throw error;
		});
	const [dto] = await loadMessageDtos(ctx, [message]);
	notifyChannelAfterResponse(ctx, message);
	return dto;
}

async function assertQuotable(
	{ db }: ViewerContext,
	messageId: string,
	channelId: string,
) {
	const quoted = await db.message.findUnique({
		where: { id: messageId },
		select: { channelId: true, deletedAt: true },
	});
	if (!quoted || quoted.channelId !== channelId || quoted.deletedAt) {
		throw new DomainError(
			"BAD_REQUEST",
			"The quoted message is no longer available",
		);
	}
}

async function confirmPendingUploads({
	db,
	user,
	attachmentIds,
}: Pick<ViewerContext, "db" | "user"> & { attachmentIds?: string[] }) {
	if (!attachmentIds?.length) return;
	const pending = await db.upload.findMany({
		where: { id: { in: attachmentIds }, userId: user.id, pending: true },
		select: { id: true, url: true, size: true, contentType: true },
	});
	for (const upload of pending) {
		const stored = await head(upload.url).catch(() => null);
		if (!stored || !storedFileMatches({ stored, upload })) {
			throw new DomainError(
				"BAD_REQUEST",
				"That video didn't finish uploading. Try adding it again.",
			);
		}
		await db.upload.update({
			where: { id: upload.id },
			data: { url: stored.url, size: stored.size, pending: false },
		});
	}
}
