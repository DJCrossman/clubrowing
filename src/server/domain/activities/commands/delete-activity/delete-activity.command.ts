import type { Context } from "@/domain/common/context";
import { removeUploads } from "@/domain/common/remove-uploads";
import type { DeleteActivityInput } from "@/schemas";

export async function deleteActivityCommand(
	input: DeleteActivityInput,
	{ db, services }: Pick<Context, "db" | "services">,
) {
	const { screenshot } = await db.activity.delete({
		where: { id: input.id },
		select: { screenshot: { select: { id: true, url: true } } },
	});
	// The activity is already gone; an upload nothing points at is removed later by the orphan cleanup.
	if (screenshot)
		await removeUploads({ db, services, uploads: [screenshot] }).catch(
			(error) => console.error("Error removing screenshot:", error),
		);
}
