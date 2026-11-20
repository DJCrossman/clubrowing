import type { DeleteActivityInput } from "@/schemas";
import { removeUploads } from "@/server/common/remove-uploads";
import type { Context } from "@/server/context";

export async function deleteActivityCommand(
	input: DeleteActivityInput,
	{ db }: Context,
) {
	const { screenshot } = await db.activity.delete({
		where: { id: input.id },
		select: { screenshot: { select: { id: true, url: true } } },
	});
	// The activity is already gone; an upload nothing points at is removed later by the orphan cleanup.
	if (screenshot)
		await removeUploads({ db, uploads: [screenshot] }).catch((error) =>
			console.error("Error removing screenshot:", error),
		);
}
