import { Prisma } from "@/generated/prisma/client";
import type { SendMessage } from "@/schemas/chat.schema";
import type { ViewerContext } from "@/server/context";
import { findAccessibleChannel } from "@/server/routers/chat/common/chat-access";
import { loadMessageDtos } from "@/server/routers/chat/common/load-message-dtos";
import { messageInclude } from "@/server/routers/chat/common/map-to-message-dto";
import { notifyChannelAfterResponse } from "@/server/routers/chat/common/message-notifications";
import { TRPCError } from "@/server/trpc";

export async function sendMessageCommand(
	input: SendMessage,
	ctx: ViewerContext,
) {
	const { db, user } = ctx;
	await findAccessibleChannel(db, input.channelId, user);
	if (input.quotedMessageId) {
		await assertQuotable(ctx, input.quotedMessageId, input.channelId);
	}
	const message = await db.message
		.create({
			data: {
				channelId: input.channelId,
				authorUserId: user.id,
				text: input.text || null,
				gif: input.gif?.title ?? null,
				gifId: input.gif?.id ?? null,
				quotedMessageId: input.quotedMessageId ?? null,
				// Only the sender's own uploads that no message or activity holds yet, so a
				// double send can't attach the same file twice.
				attachments: {
					connect: input.attachmentIds?.map((id) => ({
						id,
						userId: user.id,
						messageId: null,
						activity: null,
						previewOf: null,
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
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Those files can't be added. Try adding them again.",
				});
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
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The quoted message is no longer available",
		});
	}
}
