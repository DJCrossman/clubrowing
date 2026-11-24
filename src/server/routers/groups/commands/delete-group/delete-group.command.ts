import type { DeleteGroupInput } from "@/schemas";
import type { Context } from "@/server/domain/common/context";
import { removeUploads } from "@/server/domain/common/remove-uploads";
import { findGroupOrThrow } from "../../common/find-group-or-throw";

export async function deleteGroupCommand(
	{ id }: DeleteGroupInput,
	{ db }: Context,
) {
	await findGroupOrThrow(db, id);
	await removeUploads({
		db,
		uploads: await db.upload.findMany({
			where: { message: { channel: { groupId: id } } },
			select: { id: true, url: true },
		}),
	});
	await db.$transaction([
		db.channel.deleteMany({ where: { groupId: id } }),
		db.group.delete({ where: { id } }),
	]);
	return true;
}
