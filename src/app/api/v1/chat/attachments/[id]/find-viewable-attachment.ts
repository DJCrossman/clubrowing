import { TRPCError } from "@trpc/server";
import { athleteInclude } from "@/domain/athletes/common/map-to-athlete-dto";
import { findAccessibleMessage } from "@/domain/chat/common/chat-access";
import type { Context, SessionUser } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import { resolveViewerAccess } from "@/trpc/middleware/viewer-access";

export async function findViewableAttachment({
	db,
	user,
	id,
}: Pick<Context, "db"> & { user: SessionUser; id: string }) {
	try {
		resolveViewerAccess({
			user,
			athlete: await db.athlete.findUnique({
				where: { userId: user.id },
				include: athleteInclude,
			}),
		});
		const upload = await db.upload.findUnique({
			where: { id },
			select: {
				userId: true,
				url: true,
				name: true,
				size: true,
				contentType: true,
				pending: true,
				messageId: true,
				previewOf: { select: { messageId: true } },
			},
		});
		const messageId = upload?.messageId ?? upload?.previewOf?.messageId;
		if (!messageId) {
			return null;
		}
		const message = await findAccessibleMessage(db, messageId, user);
		return message.deletedAt ? null : upload;
	} catch (error) {
		if (error instanceof TRPCError || error instanceof DomainError) {
			return null;
		}
		throw error;
	}
}
