import { TRPCError } from "@trpc/server";
import { athleteInclude } from "@/server/domain/athletes/common/map-to-athlete-dto";
import type { Context, SessionUser } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { resolveViewerAccess } from "@/server/infra/trpc/middleware/viewer-access";
import { findAccessibleMessage } from "@/server/routers/chat/common/chat-access";

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
