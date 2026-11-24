import type { Context } from "@/domain/common/context";
import type { DeleteErgInput } from "@/schemas";

export async function deleteErgCommand(
	input: DeleteErgInput,
	{ db }: Context,
): Promise<boolean> {
	await db.erg.delete({ where: { id: input.id } });
	return true;
}
