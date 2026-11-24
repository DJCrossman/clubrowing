import type { DeleteActivityInput } from "@/schemas";
import type { Context } from "@/server/domain/common/context";
import { removeUploads } from "@/server/domain/common/remove-uploads";

export async function deleteActivityCommand(
	input: DeleteActivityInput,
	{ db }: Pick<Context, "db">,
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
